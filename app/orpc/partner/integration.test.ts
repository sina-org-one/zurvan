import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "~/db/client.server";
import { commission, consent, partner, partnerLead, payment, user } from "~/db/schema";
import { toPersianDigits } from "~/lib/digits";
import { phonePlaceholderEmail } from "~/lib/phone";
import { findPartnerForNewCustomer } from "~/lib/referral.server";
import { markPaid, recordPurchaseCommission } from "~/orpc/commission/service";
import {
  acceptPartnerTerms,
  addLead,
  adminListPartners,
  createPartner,
  getPartnerProfile,
  listMyPeople,
  setPartnerActive,
  updatePartnerProfile,
} from "~/orpc/partner/service";
import { m } from "~/paraglide/messages";

/*===== Partner Sheba =====*/
// Runs against the real database: the boundary is that the update only ever targets the caller's own `partner` row,
// which a mock would not exercise. Needs the `partner` table (`npm run db:push`).

const runId = randomUUID().slice(0, 8);
const partnerA = { id: `test-partner-a-${runId}`, phone: `0992${Math.floor(1000000 + Math.random() * 8999999)}` };
const partnerB = { id: `test-partner-b-${runId}`, phone: `0993${Math.floor(1000000 + Math.random() * 8999999)}` };
// A partner user whose `partner` row was never created.
const orphan = { id: `test-partner-c-${runId}`, phone: `0994${Math.floor(1000000 + Math.random() * 8999999)}` };

/** Builds a made-up Sheba number with correct check digits (ISO 7064 mod 97-10) from 22 digits of body. */
function makeSheba(body: string): string {
  // `IR00` + body, moved as the standard says: body + "1827" ("IR") + "00".
  const remainder = [...`${body}182700`].reduce((rest, digit) => (rest * 10 + Number(digit)) % 97, 0);
  return `IR${String(98 - remainder).padStart(2, "0")}${body}`;
}

const shebaA = makeSheba("0170000000123456789012");
const shebaB = makeSheba("0120000000987654321098");
// Same shape as a real one, one digit off.
const wrongChecksum = `IR${shebaA[2] === "9" ? "1" : String(Number(shebaA[2]) + 1)}${shebaA.slice(3)}`;

beforeAll(async () => {
  await db.insert(user).values(
    [partnerA, partnerB, orphan].map((entry) => ({
      id: entry.id,
      name: "Test partner",
      email: phonePlaceholderEmail(entry.phone),
      phoneNumber: entry.phone,
      role: "partner",
    })),
  );
  await db.insert(partner).values([
    { userId: partnerA.id, code: `ta${runId}` },
    { userId: partnerB.id, code: `tb${runId}` },
  ]);
});

afterAll(async () => {
  await cleanUpPeopleFixtures();

  const ids = [partnerA.id, partnerB.id, orphan.id];
  // Partner rows first: they reference the users.
  await db.delete(partner).where(inArray(partner.userId, ids));
  await db.delete(user).where(inArray(user.id, ids));
  await db.$client.end();
});

describe("partner sheba number", () => {
  it("reads null until the partner writes it, and not-found without a partner row", async () => {
    expect(await getPartnerProfile({ db, userId: partnerA.id })).toEqual({
      kind: "success",
      profile: {
        shebaNumber: null,
        code: `ta${runId}`,
        isActive: true,
        commissionTiers: expect.any(Array),
        payingCustomers: 0,
      },
    });
    expect(await getPartnerProfile({ db, userId: orphan.id })).toEqual({ kind: "not-found" });
    expect(await updatePartnerProfile({ db, userId: orphan.id, input: { shebaNumber: shebaA } })).toEqual({
      kind: "not-found",
    });
  });

  it("rejects a wrong format and a wrong checksum with the field message, storing nothing", async () => {
    const badFormat = await updatePartnerProfile({ db, userId: partnerA.id, input: { shebaNumber: "IR12 345" } });
    const badChecksum = await updatePartnerProfile({ db, userId: partnerA.id, input: { shebaNumber: wrongChecksum } });

    expect(badFormat).toMatchObject({ kind: "invalid", fields: { shebaNumber: m.server_partner_sheba_format() } });
    expect(badChecksum).toMatchObject({ kind: "invalid", fields: { shebaNumber: m.server_partner_sheba_checksum() } });
    expect(await getPartnerProfile({ db, userId: partnerA.id })).toMatchObject({ profile: { shebaNumber: null } });
  });

  it("stores a number typed with Persian digits and spaces, normalized, and reads it back", async () => {
    // Grouped in fours, in Persian digits, and without the leading IR: all normalized away.
    const typed = toPersianDigits(shebaA.slice(2)).replace(/(.{4})/g, "$1 ");
    const result = await updatePartnerProfile({ db, userId: partnerA.id, input: { shebaNumber: ` ${typed} ` } });

    expect(result).toMatchObject({ kind: "success", profile: { shebaNumber: shebaA } });
    expect(await getPartnerProfile({ db, userId: partnerA.id })).toMatchObject({ profile: { shebaNumber: shebaA } });
  });

  it("only changes the caller's own row", async () => {
    await updatePartnerProfile({ db, userId: partnerB.id, input: { shebaNumber: shebaB } });

    // A's second write leaves B alone, and B's write left A alone.
    await updatePartnerProfile({ db, userId: partnerA.id, input: { shebaNumber: shebaA.toLowerCase() } });
    const rows = await db
      .select()
      .from(partner)
      .where(inArray(partner.userId, [partnerA.id, partnerB.id]));
    const stored = Object.fromEntries(rows.map((row) => [row.userId, row.shebaNumber]));

    expect(stored).toEqual({ [partnerA.id]: shebaA, [partnerB.id]: shebaB });
    expect(await db.select().from(partner).where(eq(partner.userId, orphan.id))).toEqual([]);
  });
});

/*===== Partner People =====*/
// The stage of each lead is computed, not stored, so these tests prove the lists say what `findPartnerForNewCustomer`
// and `recordPurchaseCommission` actually do. Every test uses its own phone numbers, so the shared partners below
// never see each other's people.

const phoneBase = `097${Math.floor(10000 + Math.random() * 89999)}`;
let phoneCounter = 0;
const newPhone = () => `${phoneBase}${String(phoneCounter++).padStart(3, "0")}`;

const peoplePartners = ["a", "b", "c", "d"].map((letter) => ({
  id: `test-people-${letter}-${runId}`,
  phone: newPhone(),
  code: `tp-${letter}-${runId}`,
}));
const [pA, pB, pC, pD] = peoplePartners as [
  (typeof peoplePartners)[number],
  (typeof peoplePartners)[number],
  (typeof peoplePartners)[number],
  (typeof peoplePartners)[number],
];
const customerIds: string[] = [];
const createdPhones: string[] = [];
let customerCounter = 0;

beforeAll(async () => {
  await db.insert(user).values(
    peoplePartners.map((entry) => ({
      id: entry.id,
      name: `Test partner ${entry.code}`,
      email: phonePlaceholderEmail(entry.phone),
      phoneNumber: entry.phone,
      role: "partner",
    })),
  );
  await db.insert(partner).values(peoplePartners.map((entry) => ({ userId: entry.id, code: entry.code })));
  // A, B and C accepted the terms; D hasn't yet.
  for (const entry of [pA, pB, pC]) await acceptPartnerTerms({ db, userId: entry.id });
});

/** A lead as the form sends it: the number with the guardian's and dog's details. */
const leadInput = (phoneNumber: string) => ({
  phoneNumber,
  guardianName: "سارا",
  dogName: "پاپی",
  dogBreed: "ژرمن شپرد",
  dogAge: "۸ ماه",
});

/** Everything the people tests wrote, in foreign-key order. Runs inside the file's single `afterAll`. */
async function cleanUpPeopleFixtures() {
  const partnerIds = peoplePartners.map((entry) => entry.id);
  // Partners the Admin-create test made.
  const created = await db
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.phoneNumber, createdPhones.length > 0 ? createdPhones : ["-"]));
  const allPartnerIds = [...partnerIds, ...created.map((row) => row.id)];

  await db.delete(commission).where(inArray(commission.customerId, customerIds));
  await db.delete(payment).where(inArray(payment.customerId, customerIds));
  await db.delete(partnerLead).where(inArray(partnerLead.partnerId, allPartnerIds));
  await db.delete(consent).where(inArray(consent.userId, allPartnerIds));
  await db.delete(user).where(inArray(user.id, customerIds));
  await db.delete(partner).where(inArray(partner.userId, allPartnerIds));
  await db.delete(user).where(inArray(user.id, allPartnerIds));
}

/** A customer, written the way the sign-up hook leaves one: attributed to whoever `findPartnerForNewCustomer` said. */
async function makeCustomer({ phone, referredBy }: { phone: string; referredBy: string | null }): Promise<string> {
  const id = `test-people-customer-${customerCounter++}-${runId}`;
  customerIds.push(id);
  await db.insert(user).values({
    id,
    name: `Customer ${id}`,
    email: phonePlaceholderEmail(phone),
    phoneNumber: phone,
    referredByPartnerId: referredBy,
  });
  return id;
}

/** A lead with an explicit time, so "earlier" is not left to the clock. */
async function makeLead({ partnerId, phone, minutesAgo }: { partnerId: string; phone: string; minutesAgo: number }) {
  await db
    .insert(partnerLead)
    .values({ partnerId, phoneNumber: phone, createdAt: new Date(Date.now() - minutesAgo * 60_000) });
}

/** A paid purchase, written the way the callback does: a paid payment, then the commission. */
async function buy({ customerId, baseAmount }: { customerId: string; baseAmount: number }): Promise<boolean> {
  const [paid] = await db
    .insert(payment)
    .values({
      customerId,
      amount: baseAmount,
      gateway: "demo",
      authority: `test-people-${runId}-${randomUUID()}`,
      status: "paid",
      paidAt: new Date(),
    })
    .returning({ id: payment.id });
  if (!paid) throw new Error("Could not insert the test payment.");
  return recordPurchaseCommission({ db, customerId, paymentId: paid.id, baseAmount });
}

async function peopleOf(partnerId: string) {
  const result = await listMyPeople({ db, userId: partnerId });
  if (result.kind !== "success") throw new Error("Expected the partner's people.");
  return result.people;
}

async function personOnPhone({ partnerId, phone }: { partnerId: string; phone: string }) {
  return (await peopleOf(partnerId)).find((person) => person.phoneNumber === phone);
}

describe("partner people", () => {
  it("the earliest lead wins, and the lists say what attribution did", async () => {
    const phone = newPhone();
    await makeLead({ partnerId: pB.id, phone, minutesAgo: 10 });
    await makeLead({ partnerId: pA.id, phone, minutesAgo: 5 });

    const winner = await findPartnerForNewCustomer({ db, referralCode: null, phoneNumber: phone });
    expect(winner).toBe(pB.id);
    expect(await personOnPhone({ partnerId: pB.id, phone })).toMatchObject({ stage: "lead", customerName: null });
    expect(await personOnPhone({ partnerId: pA.id, phone })).toMatchObject({ stage: "lost", customerName: null });

    // The customer registers: attributed to the winner, as the hook does.
    const customerId = await makeCustomer({ phone, referredBy: winner });
    expect(await personOnPhone({ partnerId: pB.id, phone })).toMatchObject({
      stage: "registered",
      customerName: `Customer ${customerId}`,
      boughtAt: null,
    });

    // Before a purchase there is nothing owed to show.
    expect((await personOnPhone({ partnerId: pB.id, phone }))?.commission).toBeNull();

    expect(await buy({ customerId, baseAmount: 5_000_000 })).toBe(true);
    const bought = await personOnPhone({ partnerId: pB.id, phone });
    expect(bought).toMatchObject({ stage: "bought", customerName: `Customer ${customerId}` });
    expect(bought?.boughtAt).toBeInstanceOf(Date);
    // The partner sees his own commission for the person (10% of 5,000,000) and that it is still waiting, not the purchase.
    expect(bought?.commission).toEqual({ amount: 500_000, unpaidAmount: 500_000, paidAt: null });
    expect(Object.keys(bought ?? {})).not.toContain("price");

    // The loser learns nothing of the customer: no name, no dates, and not who won.
    expect(await personOnPhone({ partnerId: pA.id, phone })).toMatchObject({
      stage: "lost",
      customerName: null,
      registeredAt: null,
      boughtAt: null,
      commission: null,
    });

    // The Admin's view agrees, with the commission only on the partner who earned it.
    const all = await adminListPartners({ db });
    expect(all.find((entry) => entry.id === pB.id)?.commissions).toMatchObject({ unpaidCount: 1, paidCount: 0 });
    expect(all.find((entry) => entry.id === pA.id)?.commissions).toMatchObject({ unpaidCount: 0, unpaidAmount: 0 });
    expect(all.find((entry) => entry.id === pB.id)?.counts.bought).toBe(1);
    expect(all.find((entry) => entry.id === pA.id)?.counts.lost).toBe(1);

    // Once the Admin marks it paid, the same row says so.
    const [row] = await db.select({ id: commission.id }).from(commission).where(eq(commission.customerId, customerId));
    expect((await markPaid({ db, id: row?.id ?? "" })).kind).toBe("success");
    const settled = await personOnPhone({ partnerId: pB.id, phone });
    expect(settled?.commission?.amount).toBe(500_000);
    expect(settled?.commission?.paidAt).toBeInstanceOf(Date);

    // A second purchase is still one person, with what both earned and the part that waits.
    expect(await buy({ customerId, baseAmount: 3_000_000 })).toBe(true);
    const twice = (await peopleOf(pB.id)).filter((person) => person.phoneNumber === phone);
    expect(twice).toHaveLength(1);
    expect(twice[0]?.commission).toMatchObject({ amount: 800_000, unpaidAmount: 300_000 });
  });

  it("a referral link beats a lead, and a partner never sees the other's customers", async () => {
    const phone = newPhone();
    await makeLead({ partnerId: pA.id, phone, minutesAgo: 10 });

    const winner = await findPartnerForNewCustomer({ db, referralCode: pB.code, phoneNumber: phone });
    expect(winner).toBe(pB.id);
    const customerId = await makeCustomer({ phone, referredBy: winner });

    expect(await personOnPhone({ partnerId: pA.id, phone })).toMatchObject({ stage: "lost", customerName: null });

    const bPeople = await peopleOf(pB.id);
    expect(bPeople.find((person) => person.id === customerId)).toMatchObject({
      source: "link",
      phoneNumber: null,
      stage: "registered",
      customerName: `Customer ${customerId}`,
    });
    // B has no lead on this phone, so the customer is listed once, as a link person.
    expect(bPeople.filter((person) => person.phoneNumber === phone || person.id === customerId)).toHaveLength(1);
    expect((await peopleOf(pA.id)).map((person) => person.id)).not.toContain(customerId);

    // A link customer who buys shows the partner's commission the same way a phone lead does.
    expect(await buy({ customerId, baseAmount: 2_000_000 })).toBe(true);
    const bought = (await peopleOf(pB.id)).find((person) => person.id === customerId);
    expect(bought).toMatchObject({
      stage: "bought",
      commission: { amount: 200_000, unpaidAmount: 200_000, paidAt: null },
    });
  });

  it("an inactive partner attributes no one, cannot add, and earns no commission", async () => {
    const phone = newPhone();
    await makeLead({ partnerId: pC.id, phone, minutesAgo: 10 });
    await makeLead({ partnerId: pD.id, phone, minutesAgo: 5 });
    // Brought in earlier by C's link, while C was active.
    const customerId = await makeCustomer({ phone: newPhone(), referredBy: pC.id });

    expect((await setPartnerActive({ db, id: pC.id, isActive: false })).kind).toBe("success");
    // Repeating it is fine: it is a state, not a one-way step.
    expect((await setPartnerActive({ db, id: pC.id, isActive: false })).kind).toBe("success");

    // Neither C's code nor C's earlier lead attributes anyone: D's lead is the next earliest active one.
    expect(await findPartnerForNewCustomer({ db, referralCode: pC.code, phoneNumber: phone })).toBe(pD.id);
    expect(await personOnPhone({ partnerId: pD.id, phone })).toMatchObject({ stage: "lead" });

    expect(await addLead({ db, userId: pC.id, input: leadInput(newPhone()) })).toMatchObject({
      kind: "invalid",
      errors: [expect.stringContaining("متوقف")],
    });

    expect(await buy({ customerId, baseAmount: 3_000_000 })).toBe(false);
    expect(await db.select().from(commission).where(eq(commission.customerId, customerId))).toEqual([]);

    expect(await setPartnerActive({ db, id: "no-such-partner", isActive: true })).toEqual({ kind: "not-found" });
    expect(await setPartnerActive({ db, id: customerId, isActive: true })).toEqual({ kind: "not-found" });
  });

  it("leads.add normalizes the number and refuses an account, and the partner's own repeat", async () => {
    const phone = newPhone();

    // Persian digits, spaces and a country code all land on the stored shape.
    const typed = `+${toPersianDigits(`98 ${phone.slice(1, 4)} ${phone.slice(4)}`)}`;
    const added = await addLead({ db, userId: pA.id, input: leadInput(typed) });
    expect(added).toMatchObject({ kind: "success", person: { source: "phone", phoneNumber: phone, stage: "lead" } });

    expect(await addLead({ db, userId: pA.id, input: leadInput("۰۹۱۲") })).toMatchObject({
      kind: "invalid",
      fields: { phoneNumber: expect.any(String) },
    });

    // The same partner again, however it is typed.
    expect(await addLead({ db, userId: pA.id, input: leadInput(phone) })).toEqual({
      kind: "invalid",
      errors: [],
      fields: { phoneNumber: "این شماره رو قبلاً ثبت کردی." },
    });
    expect(await db.select().from(partnerLead).where(eq(partnerLead.phoneNumber, phone))).toHaveLength(1);

    // Another partner entering it later is accepted and is behind A at once.
    const later = await addLead({ db, userId: pB.id, input: leadInput(phone) });
    expect(later).toMatchObject({ kind: "success", person: { stage: "lost", customerName: null } });

    // A number that already has an account cannot be entered by anyone.
    const registered = newPhone();
    await makeCustomer({ phone: registered, referredBy: null });
    expect(await addLead({ db, userId: pA.id, input: leadInput(registered) })).toEqual({
      kind: "invalid",
      errors: [],
      fields: { phoneNumber: "این شماره قبلاً توی سایت ثبت‌نام کرده؛ دیگه نمی‌شه به اسم تو ثبت بشه." },
    });
    expect(await db.select().from(partnerLead).where(eq(partnerLead.phoneNumber, registered))).toEqual([]);
  });

  it("leads.add asks for the guardian's and dog's details, and for the terms first", async () => {
    const phone = newPhone();

    // Every detail is required: a bare number is the "bank of numbers" the details are there to stop.
    const bare = await addLead({ db, userId: pA.id, input: { ...leadInput(phone), dogBreed: " ", dogAge: "" } });
    expect(bare).toMatchObject({
      kind: "invalid",
      fields: { dogBreed: expect.any(String), dogAge: expect.any(String) },
    });

    // D hasn't accepted the terms in force: nothing is written until he does.
    expect(await addLead({ db, userId: pD.id, input: leadInput(phone) })).toMatchObject({
      kind: "invalid",
      errors: [m.server_partner_terms_needed()],
    });
    expect(await db.select().from(partnerLead).where(eq(partnerLead.phoneNumber, phone))).toEqual([]);

    expect((await acceptPartnerTerms({ db, userId: pD.id })).kind).toBe("success");
    const added = await addLead({ db, userId: pD.id, input: leadInput(phone) });
    expect(added).toMatchObject({
      kind: "success",
      person: { details: { guardianName: "سارا", dogName: "پاپی", dogBreed: "ژرمن شپرد", dogAge: "۸ ماه" } },
    });
  });

  it("admin.create writes the user and the partner together, and refuses a taken phone or code with nothing written", async () => {
    const phone = newPhone();
    createdPhones.push(phone);

    const created = await createPartner({
      db,
      input: { firstName: " سارا ", lastName: "احمدی", phoneNumber: toPersianDigits(phone), code: "  " },
    });
    if (created.kind !== "success") throw new Error("Expected the partner to be created.");

    expect(created.partner).toMatchObject({
      name: "سارا احمدی",
      phoneNumber: phone,
      isActive: true,
      shebaNumber: null,
      people: [],
      counts: { lead: 0, registered: 0, bought: 0, lost: 0 },
    });
    expect(created.partner.code).toMatch(/^p-[a-km-np-z2-9]{6}$/);
    const [row] = await db.select().from(user).where(eq(user.id, created.partner.id));
    expect(row).toMatchObject({
      role: "partner",
      firstName: "سارا",
      lastName: "احمدی",
      phoneNumber: phone,
      phoneNumberVerified: false,
      email: phonePlaceholderEmail(phone),
    });

    // A phone that already belongs to a customer, or to the partner just made, is refused whatever the role.
    const customerPhone = newPhone();
    await makeCustomer({ phone: customerPhone, referredBy: null });
    const base = { firstName: "علی", lastName: "رضایی" };
    for (const taken of [customerPhone, phone]) {
      expect(await createPartner({ db, input: { ...base, phoneNumber: taken } })).toEqual({
        kind: "invalid",
        errors: [],
        fields: { phoneNumber: "این شماره قبلاً در سایت ثبت‌نام کرده. هر شماره یک نقش دارد." },
      });
    }

    // A taken code is refused, and the user written first in the transaction is undone with it.
    const freshPhone = newPhone();
    createdPhones.push(freshPhone);
    expect(await createPartner({ db, input: { ...base, phoneNumber: freshPhone, code: pA.code } })).toEqual({
      kind: "invalid",
      errors: [],
      fields: { code: "این کد قبلاً گرفته شده." },
    });
    expect(await db.select().from(user).where(eq(user.phoneNumber, freshPhone))).toEqual([]);

    // A bad code never reaches the database; a good typed one is kept as is.
    expect(await createPartner({ db, input: { ...base, phoneNumber: freshPhone, code: "Shop One" } })).toMatchObject({
      kind: "invalid",
      fields: { code: expect.any(String) },
    });
    const typedCode = `shop-${runId}`;
    const withCode = await createPartner({ db, input: { ...base, phoneNumber: freshPhone, code: typedCode } });
    expect(withCode).toMatchObject({ kind: "success", partner: { code: typedCode } });
    expect(await db.select({ id: user.id }).from(user).where(eq(user.phoneNumber, freshPhone))).toHaveLength(1);
  });
});
