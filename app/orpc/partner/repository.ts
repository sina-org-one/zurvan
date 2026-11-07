import { and, asc, desc, eq, exists, isNotNull, lt, ne, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { DatabaseOrTransaction } from "~/db/client.server";
import { commission, consent, partner, partnerLead, user } from "~/db/schema";
import { PARTNER_TERMS_VERSION } from "~/lib/partner-terms";

/*===== Types =====*/
type Executor = { db: DatabaseOrTransaction };

/** What the partner row itself holds: the profile minus the commission steps (a setting) and the count. */
export type PartnerProfileRecord = { shebaNumber: string | null; code: string; isActive: boolean };

/** A partner with the contact details the Admin sees. */
export type PartnerRecord = PartnerProfileRecord & {
  id: string;
  name: string;
  phoneNumber: string | null;
  role: string;
  businessName: string | null;
  businessType: string | null;
  termsAcceptedAt: Date | null;
  createdAt: Date;
};

/**
 * Everything the stage of one phone lead depends on, read in the same query as the lead. `customer` is the user who
 * registered with the lead's number (any user, whoever they are attributed to).
 */
/**
 * What a partner has earned from one customer over all their purchases, in Rial: the total, the part not yet paid, and
 * when the Admin last paid one. All null while there is no commission.
 */
export type EarnedFact = {
  commissionAmount: number | null;
  commissionUnpaidAmount: number | null;
  commissionPaidAt: Date | null;
};

export type LeadFact = {
  id: string;
  partnerId: string;
  phoneNumber: string;
  guardianName: string;
  dogName: string;
  dogBreed: string;
  dogAge: string;
  createdAt: Date;
  customer: { name: string; referredByPartnerId: string | null; createdAt: Date } | null;
  /** When this partner's first commission for that customer was written; null while there is none. */
  boughtAt: Date | null;
} & EarnedFact & {
    /** An earlier lead on the same number by another active partner, ordered as `findPartnerForNewCustomer` does. */
    hasEarlierActiveLead: boolean;
  };

/** A customer a partner's link brought, with no lead of that partner on their phone. */
export type LinkCustomerFact = {
  id: string;
  partnerId: string;
  name: string;
  createdAt: Date;
  boughtAt: Date | null;
} & EarnedFact;

export type PartnerCommissionSums = {
  partnerId: string;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
};

/*===== Profile =====*/
/** The partner's own row: `undefined` when the user has no `partner` row, a null Sheba when they have not written it yet. */
export async function findPartnerProfile({
  db,
  userId,
}: Executor & { userId: string }): Promise<PartnerProfileRecord | undefined> {
  const [row] = await db
    .select({ shebaNumber: partner.shebaNumber, code: partner.code, isActive: partner.isActive })
    .from(partner)
    .where(eq(partner.userId, userId));
  return row;
}

/**
 * Writes the Sheba number of this user's own `partner` row, and only that row.
 *
 * @returns The stored row, or `undefined` when the user has no `partner` row.
 */
export async function updateShebaNumber({
  db,
  userId,
  shebaNumber,
}: Executor & { userId: string; shebaNumber: string }): Promise<PartnerProfileRecord | undefined> {
  const [row] = await db
    .update(partner)
    .set({ shebaNumber })
    .where(eq(partner.userId, userId))
    .returning({ shebaNumber: partner.shebaNumber, code: partner.code, isActive: partner.isActive });
  return row;
}

/*===== People =====*/
/**
 * The facts behind a partner's people, for one partner or for all of them: two queries, however many partners there
 * are. The stage is decided in the service from these facts; here the database only does the joining.
 */
export async function findPeople({
  db,
  partnerId,
}: Executor & { partnerId?: string }): Promise<{ leads: LeadFact[]; linkCustomers: LinkCustomerFact[] }> {
  /*------ Earned, per partner and customer ------*/
  // A customer earns a commission on every purchase (F7), so they are summed here, one row per pair, before the joins.
  const earned = db
    .select({
      partnerId: commission.partnerId,
      customerId: commission.customerId,
      firstAt: sql`min(${commission.createdAt})`.mapWith(commission.createdAt).as("first_at"),
      amount: sql`sum(${commission.amount})`.mapWith(Number).as("amount"),
      unpaidAmount: sql`coalesce(sum(${commission.amount}) filter (where ${commission.paidAt} is null), 0)`
        .mapWith(Number)
        .as("unpaid_amount"),
      lastPaidAt: sql`max(${commission.paidAt})`.mapWith(commission.paidAt).as("last_paid_at"),
    })
    .from(commission)
    .groupBy(commission.partnerId, commission.customerId)
    .as("earned");

  /*------ Phone leads ------*/
  const earlierLead = alias(partnerLead, "earlier_lead");
  const earlierPartner = alias(partner, "earlier_partner");
  const hasEarlierActiveLead = exists(
    db
      .select({ one: sql`1` })
      .from(earlierLead)
      .innerJoin(earlierPartner, eq(earlierLead.partnerId, earlierPartner.userId))
      .where(
        and(
          eq(earlierLead.phoneNumber, partnerLead.phoneNumber),
          ne(earlierLead.partnerId, partnerLead.partnerId),
          eq(earlierPartner.isActive, true),
          or(
            lt(earlierLead.createdAt, partnerLead.createdAt),
            and(eq(earlierLead.createdAt, partnerLead.createdAt), lt(earlierLead.id, partnerLead.id)),
          ),
        ),
      ),
  );

  const leadRows = await db
    .select({
      id: partnerLead.id,
      partnerId: partnerLead.partnerId,
      phoneNumber: partnerLead.phoneNumber,
      guardianName: partnerLead.guardianName,
      dogName: partnerLead.dogName,
      dogBreed: partnerLead.dogBreed,
      dogAge: partnerLead.dogAge,
      createdAt: partnerLead.createdAt,
      customerId: user.id,
      customerName: user.name,
      customerReferredBy: user.referredByPartnerId,
      customerCreatedAt: user.createdAt,
      boughtAt: earned.firstAt,
      commissionAmount: earned.amount,
      commissionUnpaidAmount: earned.unpaidAmount,
      commissionPaidAt: earned.lastPaidAt,
      hasEarlierActiveLead: sql<boolean>`${hasEarlierActiveLead}`,
    })
    .from(partnerLead)
    .leftJoin(user, eq(user.phoneNumber, partnerLead.phoneNumber))
    // Only this partner's own commissions count as "bought" for his lead.
    .leftJoin(earned, and(eq(earned.customerId, user.id), eq(earned.partnerId, partnerLead.partnerId)))
    .where(partnerId ? eq(partnerLead.partnerId, partnerId) : undefined)
    .orderBy(asc(partnerLead.createdAt), asc(partnerLead.id));

  const leads = leadRows.map((row): LeadFact => ({
    id: row.id,
    partnerId: row.partnerId,
    phoneNumber: row.phoneNumber,
    guardianName: row.guardianName,
    dogName: row.dogName,
    dogBreed: row.dogBreed,
    dogAge: row.dogAge,
    createdAt: row.createdAt,
    customer:
      row.customerId === null || row.customerName === null || row.customerCreatedAt === null
        ? null
        : { name: row.customerName, referredByPartnerId: row.customerReferredBy, createdAt: row.customerCreatedAt },
    boughtAt: row.boughtAt,
    commissionAmount: row.commissionAmount,
    commissionUnpaidAmount: row.commissionUnpaidAmount,
    commissionPaidAt: row.commissionPaidAt,
    hasEarlierActiveLead: row.hasEarlierActiveLead,
  }));

  /*------ Link customers ------*/
  const linkRows = await db
    .select({
      id: user.id,
      partnerId: user.referredByPartnerId,
      name: user.name,
      createdAt: user.createdAt,
      boughtAt: earned.firstAt,
      commissionAmount: earned.amount,
      commissionUnpaidAmount: earned.unpaidAmount,
      commissionPaidAt: earned.lastPaidAt,
    })
    .from(user)
    .leftJoin(earned, and(eq(earned.customerId, user.id), eq(earned.partnerId, user.referredByPartnerId)))
    .where(
      and(
        partnerId ? eq(user.referredByPartnerId, partnerId) : isNotNull(user.referredByPartnerId),
        // A customer the partner also entered as a lead is that lead (source "phone"), not a second person.
        notExists(
          db
            .select({ one: sql`1` })
            .from(partnerLead)
            .where(
              and(eq(partnerLead.partnerId, user.referredByPartnerId), eq(partnerLead.phoneNumber, user.phoneNumber)),
            ),
        ),
      ),
    );

  const linkCustomers = linkRows.flatMap((row) => (row.partnerId ? [{ ...row, partnerId: row.partnerId }] : []));

  return { leads, linkCustomers };
}

/*===== Admin Reads =====*/
/** Partners with their contact details, newest first. `partnerId` narrows them to one. */
export async function findPartners({ db, partnerId }: Executor & { partnerId?: string }): Promise<PartnerRecord[]> {
  return db
    .select({
      id: partner.userId,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      code: partner.code,
      shebaNumber: partner.shebaNumber,
      isActive: partner.isActive,
      businessName: partner.businessName,
      businessType: partner.businessType,
      termsAcceptedAt: sql<Date | null>`(
        select max(${consent.acceptedAt}) from ${consent}
        where ${consent.userId} = ${partner.userId} and ${consent.kind} = 'partner-terms'
          and ${consent.version} = ${PARTNER_TERMS_VERSION} and ${consent.revokedAt} is null
      )`.mapWith(consent.acceptedAt),
      createdAt: partner.createdAt,
    })
    .from(partner)
    .innerJoin(user, eq(partner.userId, user.id))
    .where(partnerId ? eq(partner.userId, partnerId) : undefined)
    .orderBy(desc(partner.createdAt), asc(partner.userId));
}

/** What each partner is owed and has been paid, in Rial: one grouped query for all partners (or the one). */
export async function findCommissionSums({
  db,
  partnerId,
}: Executor & { partnerId?: string }): Promise<PartnerCommissionSums[]> {
  const unpaid = sql`${commission.paidAt} is null`;
  const paid = sql`${commission.paidAt} is not null`;

  return db
    .select({
      partnerId: commission.partnerId,
      unpaidCount: sql<number>`count(*) filter (where ${unpaid})`.mapWith(Number),
      unpaidAmount: sql<number>`coalesce(sum(${commission.amount}) filter (where ${unpaid}), 0)`.mapWith(Number),
      paidCount: sql<number>`count(*) filter (where ${paid})`.mapWith(Number),
      paidAmount: sql<number>`coalesce(sum(${commission.amount}) filter (where ${paid}), 0)`.mapWith(Number),
    })
    .from(commission)
    .where(partnerId ? eq(commission.partnerId, partnerId) : undefined)
    .groupBy(commission.partnerId);
}

/** The id of the user who has this phone number, whatever their role. */
export async function findUserIdByPhone({
  db,
  phoneNumber,
}: Executor & { phoneNumber: string }): Promise<string | undefined> {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.phoneNumber, phoneNumber));
  return row?.id;
}

/** The id and role of the user with this number, or `undefined` when nobody has it. */
export async function findUserByPhone({
  db,
  phoneNumber,
}: Executor & { phoneNumber: string }): Promise<{ id: string; role: string } | undefined> {
  const [row] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.phoneNumber, phoneNumber));
  return row;
}

/**
 * Makes a customer a partner (the owner, 2026-11-07: a partner can be a customer too): the role changes, and their dogs,
 * cart and purchases stay theirs. Only a `customer` changes, so a racing second approval leaves the first as it is.
 *
 * @returns Whether the user was a customer and is now a partner.
 */
export async function promoteCustomerToPartner({ db, userId }: Executor & { userId: string }): Promise<boolean> {
  const rows = await db
    .update(user)
    .set({ role: "partner" })
    .where(and(eq(user.id, userId), eq(user.role, "customer")))
    .returning({ id: user.id });
  return rows.length > 0;
}

/** Sets the business on a partner row (one a customer already had for referring, or a new one). */
export async function updatePartnerBusiness({
  db,
  userId,
  business,
}: Executor & { userId: string; business: { businessName: string; businessType: string } }): Promise<void> {
  await db.update(partner).set(business).where(eq(partner.userId, userId));
}

/** The role of the user with this number, or `undefined` when nobody has it. */
export async function findUserRoleByPhone({
  db,
  phoneNumber,
}: Executor & { phoneNumber: string }): Promise<string | undefined> {
  const [row] = await db.select({ role: user.role }).from(user).where(eq(user.phoneNumber, phoneNumber));
  return row?.role;
}

/*===== Writes =====*/
/**
 * Stores a lead unless this partner already entered the number. The unique index on partner and phone is the arbiter,
 * so two racing entries still leave one lead.
 *
 * @returns The new lead's id, or `undefined` when the partner had already entered it.
 */
export async function insertLeadOnce({
  db,
  partnerId,
  phoneNumber,
  details,
}: Executor & {
  partnerId: string;
  phoneNumber: string;
  details: { guardianName: string; dogName: string; dogBreed: string; dogAge: string };
}): Promise<string | undefined> {
  const [row] = await db
    .insert(partnerLead)
    .values({ partnerId, phoneNumber, ...details })
    .onConflictDoNothing({ target: [partnerLead.partnerId, partnerLead.phoneNumber] })
    .returning({ id: partnerLead.id });
  return row?.id;
}

/**
 * Creates the partner's user, unless the phone (or its placeholder email) already belongs to a user.
 *
 * @returns Whether a user was written.
 */
export async function insertPartnerUserOnce({
  db,
  values,
}: Executor & { values: typeof user.$inferInsert }): Promise<boolean> {
  // No conflict target: the phone and the email derived from it are both unique, and either one means "taken".
  const rows = await db.insert(user).values(values).onConflictDoNothing().returning({ id: user.id });
  return rows.length > 0;
}

/**
 * Creates the `partner` row of an existing user, unless the code is taken.
 *
 * @returns Whether a row was written.
 */
export async function insertPartnerOnce({
  db,
  userId,
  code,
  business,
}: Executor & {
  userId: string;
  code: string;
  business?: { businessName: string; businessType: string };
}): Promise<boolean> {
  const rows = await db
    .insert(partner)
    .values({ userId, code, ...business })
    .onConflictDoNothing({ target: partner.code })
    .returning({ userId: partner.userId });
  return rows.length > 0;
}

/**
 * Sets whether a partner is active. Setting the state he is already in succeeds, so it is safe to repeat.
 *
 * @returns Whether a partner with this id exists.
 */
export async function updatePartnerActive({
  db,
  partnerId,
  isActive,
}: Executor & { partnerId: string; isActive: boolean }): Promise<boolean> {
  const rows = await db
    .update(partner)
    .set({ isActive })
    .where(eq(partner.userId, partnerId))
    .returning({ userId: partner.userId });
  return rows.length > 0;
}
