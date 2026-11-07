import { randomInt, randomUUID } from "node:crypto";

import type { Database, DatabaseOrTransaction } from "~/db/client.server";
import { phonePlaceholderEmail } from "~/lib/phone";
import { issuesToErrorData } from "~/lib/schema-issues";
import { PARTNER_TERMS_VERSION } from "~/lib/partner-terms";
import { countPayingCustomers, findCommissionTiers } from "~/orpc/commission/repository";
import { findStandingConsents, insertConsent } from "~/orpc/consent/repository";
import type { AdminPartner, PartnerPerson, PartnerPersonStage, PartnerProfile } from "~/orpc/partner/contract";
import { toAdminPartner, toLinkPerson, toPartnerProfile, toPhonePerson } from "~/orpc/partner/mapper";
import {
  findCommissionSums,
  findPartnerProfile,
  findPartners,
  findPeople,
  findUserByPhone,
  findUserIdByPhone,
  findUserRoleByPhone,
  promoteCustomerToPartner,
  updatePartnerBusiness,
  insertLeadOnce,
  insertPartnerOnce,
  insertPartnerUserOnce,
  updatePartnerActive,
  updateShebaNumber,
  type LeadFact,
  type PartnerProfileRecord,
} from "~/orpc/partner/repository";
import {
  addLeadInputSchema,
  createPartnerInputSchema,
  partnerProfileInputSchema,
  phoneNumberSchema,
} from "~/orpc/partner/validation";
import { m } from "~/paraglide/messages";

/*===== Types =====*/
type Own = { db: DatabaseOrTransaction; userId: string };

type NotFoundResult = { kind: "not-found" };
type InvalidResult = { kind: "invalid"; errors: string[]; fields: Record<string, string> };

/*===== Messages =====*/
// The Admin's (a new partner), so Persian only. The partner's own refusals are `m.server_partner_…()`, called where they
// happen so they are in that request's language.
const PARTNER_PHONE_TAKEN_MESSAGE = "این شماره مال یه همکار دیگه یا مدیره. شماره‌ی مشتری رو می‌شه همکار کرد.";
const PARTNER_CODE_TAKEN_MESSAGE = "این کد قبلاً گرفته شده.";

/*===== Profile =====*/
/** The row plus what the commission depends on: the steps in force and how many paying customers the partner has. */
async function withCommission({
  db,
  userId,
  record,
}: {
  db: DatabaseOrTransaction;
  userId: string;
  record: PartnerProfileRecord;
}) {
  const [commissionTiers, payingCustomers, accepted] = await Promise.all([
    findCommissionTiers({ db }),
    countPayingCustomers({ db, partnerId: userId }),
    hasAcceptedPartnerTerms({ db, userId }),
  ]);
  return toPartnerProfile({
    record,
    commissionTiers,
    payingCustomers,
    terms: { version: PARTNER_TERMS_VERSION, accepted },
  });
}

/*===== Terms =====*/
/** Whether this partner accepted exactly the version of the terms in force. */
export async function hasAcceptedPartnerTerms({ db, userId }: Own): Promise<boolean> {
  const standing = await findStandingConsents({ db, userId, kind: "partner-terms" });
  return standing.some((record) => record.version === PARTNER_TERMS_VERSION);
}

type AcceptTermsResult = { kind: "success"; profile: PartnerProfile } | NotFoundResult;

/** Records the partner's acceptance of the terms in force now. Again is the same as once. */
export async function acceptPartnerTerms({
  db,
  userId,
  now = new Date(),
}: Own & { now?: Date }): Promise<AcceptTermsResult> {
  const record = await findPartnerProfile({ db, userId });
  if (!record) return { kind: "not-found" };

  await insertConsent({ db, userId, kind: "partner-terms", version: PARTNER_TERMS_VERSION, acceptedAt: now });
  return { kind: "success", profile: await withCommission({ db, userId, record }) };
}

type GetProfileResult = { kind: "success"; profile: PartnerProfile } | NotFoundResult;

/** @returns `not-found` for a partner user with no `partner` row. */
export async function getPartnerProfile({ db, userId }: Own): Promise<GetProfileResult> {
  const record = await findPartnerProfile({ db, userId });
  return record ? { kind: "success", profile: await withCommission({ db, userId, record }) } : { kind: "not-found" };
}

type UpdateProfileResult = { kind: "success"; profile: PartnerProfile } | InvalidResult | NotFoundResult;

/**
 * F1: the partner writes the Sheba number the Admin pays commissions to. The raw text is normalized and checked (format
 * and checksum) before anything is stored. The write targets the caller's own row; no partner id comes from the input.
 */
export async function updatePartnerProfile({
  db,
  userId,
  input,
}: Own & { input: { shebaNumber: string } }): Promise<UpdateProfileResult> {
  /*------ Validate ------*/
  const parsed = partnerProfileInputSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };

  /*------ Store ------*/
  const record = await updateShebaNumber({ db, userId, shebaNumber: parsed.data.shebaNumber });
  return record ? { kind: "success", profile: await withCommission({ db, userId, record }) } : { kind: "not-found" };
}

/*===== Stage =====*/
/**
 * F7: where a partner's phone lead stands. Must agree with `findPartnerForNewCustomer` (`referral.server.ts`), which
 * decides who a customer is attributed to; this only reads the outcome back.
 *
 * - The number belongs to a customer attributed to this partner: `registered`, or `bought` once this partner has a
 *   commission for them.
 * - The number belongs to a customer attributed to anyone else or no one: `lost` (a referral link or another lead beat
 *   this one, or the customer registered before the lead existed).
 * - Nobody has registered with it, and another active partner entered it earlier (`createdAt`, then `id`): `lost`.
 *   Earlier leads of inactive partners do not count: they attribute no one.
 * - Otherwise: `lead`.
 */
export function stageOfLead({ fact }: { fact: LeadFact }): PartnerPersonStage {
  if (fact.customer) {
    if (fact.customer.referredByPartnerId !== fact.partnerId) return "lost";
    return fact.boughtAt ? "bought" : "registered";
  }

  return fact.hasEarlierActiveLead ? "lost" : "lead";
}

/*===== People =====*/
/** Each partner's people, newest first, from the two queries behind `findPeople`. */
async function loadPeople({
  db,
  partnerId,
}: {
  db: DatabaseOrTransaction;
  partnerId?: string;
}): Promise<Map<string, PartnerPerson[]>> {
  const { leads, linkCustomers } = await findPeople({ db, partnerId });

  const byPartner = new Map<string, PartnerPerson[]>();
  const push = (id: string, person: PartnerPerson) => byPartner.set(id, [...(byPartner.get(id) ?? []), person]);

  for (const fact of leads) push(fact.partnerId, toPhonePerson({ fact, stage: stageOfLead({ fact }) }));
  for (const fact of linkCustomers) push(fact.partnerId, toLinkPerson({ fact }));

  for (const people of byPartner.values()) {
    people.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
  }
  return byPartner;
}

type ListPeopleResult = { kind: "success"; people: PartnerPerson[] } | NotFoundResult;

/** The signed-in partner's people, newest first. `not-found` for a partner user with no `partner` row. */
export async function listMyPeople({ db, userId }: Own): Promise<ListPeopleResult> {
  if (!(await findPartnerProfile({ db, userId }))) return { kind: "not-found" };

  const people = await loadPeople({ db, partnerId: userId });
  return { kind: "success", people: people.get(userId) ?? [] };
}

/*===== Add Lead =====*/
type AddLeadResult = { kind: "success"; person: PartnerPerson } | InvalidResult | NotFoundResult;

/**
 * F7: the partner enters a phone number of someone he expects to register. A lead only matters at registration, so a
 * number that already has an account is refused. A number another partner entered is accepted: he is first or he is
 * not, and the list says `lost` at once if he is not. Leads are never edited or deleted, so earliest-wins cannot be
 * gamed.
 */
export async function addLead({
  db,
  userId,
  input,
}: Own & {
  input: { phoneNumber: string; guardianName: string; dogName: string; dogBreed: string; dogAge: string };
}): Promise<AddLeadResult> {
  /*------ Validate ------*/
  const parsed = addLeadInputSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };
  const { phoneNumber, ...details } = parsed.data;

  /*------ Who may add ------*/
  const profile = await findPartnerProfile({ db, userId });
  if (!profile) return { kind: "not-found" };
  if (!profile.isActive) return { kind: "invalid", errors: [m.server_partner_inactive()], fields: {} };
  // The terms say what a lead may be; nobody enters one before accepting the version in force.
  if (!(await hasAcceptedPartnerTerms({ db, userId }))) {
    return { kind: "invalid", errors: [m.server_partner_terms_needed()], fields: {} };
  }

  if (await findUserIdByPhone({ db, phoneNumber })) {
    return { kind: "invalid", errors: [], fields: { phoneNumber: m.server_partner_lead_registered() } };
  }

  /*------ Store ------*/
  const leadId = await insertLeadOnce({ db, partnerId: userId, phoneNumber, details });
  if (!leadId) return { kind: "invalid", errors: [], fields: { phoneNumber: m.server_partner_lead_repeat() } };

  // Read back through the same stage logic as the list, so the form shows what the list will.
  const people = await loadPeople({ db, partnerId: userId });
  const person = people.get(userId)?.find((entry) => entry.id === leadId);
  if (!person) throw new Error(`addLead: lead ${leadId} was not found after it was stored`);
  return { kind: "success", person };
}

/*===== Customer Referrers =====*/
/**
 * F7 (the owner, 2026-11-07): a customer refers friends the same way a partner brings customers (link, QR, entered
 * leads, the same gift steps), so a customer gets a `partner` row of their own, with a generated link code, the first
 * time they open their referral page. The row is what the referral machinery reads; the user keeps the `customer` role.
 * Safe to repeat: an existing row is left as it is.
 */
export async function ensureReferrerRow({ db, userId }: Own): Promise<void> {
  if (await findPartnerProfile({ db, userId })) return;
  for (let attempt = 0; attempt < GENERATED_CODE_ATTEMPTS; attempt += 1) {
    if (await insertPartnerOnce({ db, userId, code: generatePartnerCode() })) return;
    // Taken code, or another tab made the row meanwhile.
    if (await findPartnerProfile({ db, userId })) return;
  }
  throw new Error("ensureReferrerRow: could not generate a free referral code");
}

/*===== Partner Sign-in =====*/
/** Whether the number (as typed) belongs to a partner account. A number that isn't a phone number is simply no. */
export async function isPartnerPhone({
  db,
  phoneNumber,
}: {
  db: DatabaseOrTransaction;
  phoneNumber: string;
}): Promise<boolean> {
  const parsed = phoneNumberSchema.safeParse(phoneNumber);
  if (!parsed.success) return false;
  return (await findUserRoleByPhone({ db, phoneNumber: parsed.data })) === "partner";
}

/*===== Admin List =====*/
/** Partners (all, or the one) with counts, commission sums and people: four queries, however many partners. */
async function loadAdminPartners({
  db,
  partnerId,
}: {
  db: DatabaseOrTransaction;
  partnerId?: string;
}): Promise<AdminPartner[]> {
  const [records, people, sums] = await Promise.all([
    findPartners({ db, partnerId }),
    loadPeople({ db, partnerId }),
    findCommissionSums({ db, partnerId }),
  ]);
  const sumsByPartner = new Map(sums.map((row) => [row.partnerId, row]));

  return records.map((record) =>
    toAdminPartner({ record, people: people.get(record.id) ?? [], sums: sumsByPartner.get(record.id) }),
  );
}

/** Every partner, newest first. */
export async function adminListPartners({ db }: { db: DatabaseOrTransaction }): Promise<AdminPartner[]> {
  return loadAdminPartners({ db });
}

/*===== Admin Create =====*/
// No `0`/`o`, `1`/`l`/`i` or `.`: the code is read off a printed card and typed by hand.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const GENERATED_CODE_LENGTH = 6;
const GENERATED_CODE_ATTEMPTS = 5;

/** `p-` and six characters that are easy to read aloud. Collisions are caught by the unique index, not here. */
function generatePartnerCode(): string {
  let suffix = "";
  for (let index = 0; index < GENERATED_CODE_LENGTH; index += 1)
    suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `p-${suffix}`;
}

/** Thrown inside the transaction to undo the user row when the partner row cannot be written. */
class RollbackCreate extends Error {}

type CreateAttempt = { kind: "created"; id: string } | { kind: "phone-taken" } | { kind: "code-taken" };

/**
 * One try at writing the user and the partner row together. Both inserts use conflict handling, so a taken phone or
 * code is an outcome, not an exception; a taken code undoes the user row already written in the same transaction.
 */
async function tryCreatePartner({
  db,
  firstName,
  lastName,
  phoneNumber,
  code,
  business,
}: {
  db: DatabaseOrTransaction;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  code: string;
  business?: { businessName: string; businessType: string };
}): Promise<CreateAttempt> {
  const id = randomUUID();

  try {
    return await db.transaction(async (tx): Promise<CreateAttempt> => {
      const wroteUser = await insertPartnerUserOnce({
        db: tx,
        values: {
          id,
          name: `${firstName} ${lastName}`,
          email: phonePlaceholderEmail(phoneNumber),
          phoneNumber,
          // The Admin vouches for the number; sign-in with a code verifies it for real.
          phoneNumberVerified: false,
          firstName,
          lastName,
          role: "partner",
          status: "active",
        },
      });
      if (!wroteUser) return { kind: "phone-taken" };

      if (!(await insertPartnerOnce({ db: tx, userId: id, code, business }))) throw new RollbackCreate();
      return { kind: "created", id };
    });
  } catch (error) {
    if (error instanceof RollbackCreate) return { kind: "code-taken" };
    throw error;
  }
}

type CreatePartnerResult = { kind: "success"; partner: AdminPartner } | InvalidResult;

type CreateAccountResult = { kind: "created"; id: string } | InvalidResult;

/**
 * Writes the user and partner rows, generating a code (retried on collision) unless one was typed. Shared by the
 * Admin's own form and the approval of an application; runs inside the caller's transaction when given one.
 */
export async function createPartnerAccount({
  db,
  firstName,
  lastName,
  phoneNumber,
  code: typedCode,
  business,
}: {
  db: DatabaseOrTransaction;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  code?: string | undefined;
  business?: { businessName: string; businessType: string };
}): Promise<CreateAccountResult> {
  /*------ An Existing Customer ------*/
  // A partner can be a customer too (the owner, 2026-11-07): a customer's number becomes a partner's, keeping their
  // dogs and purchases (and their referral row and link code, if they already referred friends). A partner's or the
  // Admin's number is still refused: one account per number.
  const existing = await findUserByPhone({ db, phoneNumber });
  if (existing) {
    if (existing.role !== "customer") {
      return { kind: "invalid", errors: [], fields: { phoneNumber: PARTNER_PHONE_TAKEN_MESSAGE } };
    }
    const promoted = await promoteCustomerToPartner({ db, userId: existing.id });
    if (!promoted) return { kind: "invalid", errors: [], fields: { phoneNumber: PARTNER_PHONE_TAKEN_MESSAGE } };
    if (typedCode && !(await findPartnerProfile({ db, userId: existing.id }))) {
      if (!(await insertPartnerOnce({ db, userId: existing.id, code: typedCode, business }))) {
        throw new RollbackCreate();
      }
    } else {
      await ensureReferrerRow({ db, userId: existing.id });
      if (business) await updatePartnerBusiness({ db, userId: existing.id, business });
    }
    return { kind: "created", id: existing.id };
  }

  for (let attempt = 0; attempt < (typedCode ? 1 : GENERATED_CODE_ATTEMPTS); attempt += 1) {
    const outcome = await tryCreatePartner({
      db,
      firstName,
      lastName,
      phoneNumber,
      code: typedCode ?? generatePartnerCode(),
      business,
    });

    if (outcome.kind === "phone-taken") {
      return { kind: "invalid", errors: [], fields: { phoneNumber: PARTNER_PHONE_TAKEN_MESSAGE } };
    }
    if (outcome.kind === "created") return outcome;
    // `code-taken`: a typed code is refused below; a generated one is retried with a fresh draw.
  }

  if (typedCode) return { kind: "invalid", errors: [], fields: { code: PARTNER_CODE_TAKEN_MESSAGE } };
  throw new Error("createPartnerAccount: could not generate a free partner code");
}

/**
 * F7: the Admin creates a partner's account: a `user` with the `partner` role and its `partner` row, in one transaction
 * so a refused code leaves no user behind. A blank code is generated and retried on collision; a code the Admin typed is
 * refused when taken. No SMS is sent: the Admin phones the partner himself.
 */
export async function createPartner({
  db,
  input,
}: {
  db: Database;
  input: { firstName: string; lastName: string; phoneNumber: string; code?: string | undefined };
}): Promise<CreatePartnerResult> {
  /*------ Validate ------*/
  const parsed = createPartnerInputSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };
  const { firstName, lastName, phoneNumber, code: typedCode } = parsed.data;

  /*------ Write ------*/
  // One transaction: a customer promoted to partner is undone when their typed code turns out to be taken.
  let outcome: CreateAccountResult;
  try {
    outcome = await db.transaction((tx) =>
      createPartnerAccount({ db: tx, firstName, lastName, phoneNumber, code: typedCode }),
    );
  } catch (error) {
    if (error instanceof RollbackCreate) {
      return { kind: "invalid", errors: [], fields: { code: PARTNER_CODE_TAKEN_MESSAGE } };
    }
    throw error;
  }
  if (outcome.kind === "invalid") return outcome;

  const [created] = await loadAdminPartners({ db, partnerId: outcome.id });
  if (!created) throw new Error(`createPartner: partner ${outcome.id} was not found after it was stored`);
  return { kind: "success", partner: created };
}

/*===== Admin Set Active =====*/
type SetActiveResult = { kind: "success"; partner: AdminPartner } | NotFoundResult;

/**
 * F7: opens or closes a partner's account. An inactive partner's link and leads attribute no one and write no
 * commission; what is already written stays. Setting the state he is already in succeeds. User ids are text, so an
 * unknown id is simply no row.
 */
export async function setPartnerActive({
  db,
  id,
  isActive,
}: {
  db: DatabaseOrTransaction;
  id: string;
  isActive: boolean;
}): Promise<SetActiveResult> {
  if (!(await updatePartnerActive({ db, partnerId: id, isActive }))) return { kind: "not-found" };

  const [updated] = await loadAdminPartners({ db, partnerId: id });
  return updated ? { kind: "success", partner: updated } : { kind: "not-found" };
}
