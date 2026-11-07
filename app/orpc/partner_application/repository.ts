import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";

import type { DatabaseOrTransaction } from "~/db/client.server";
import { partnerApplication, partnerApplicationDocument } from "~/db/schema";

/*===== Types =====*/
type Executor = { db: DatabaseOrTransaction };

export type PartnerApplicationRecord = typeof partnerApplication.$inferSelect;
export type PartnerDocumentRecord = typeof partnerApplicationDocument.$inferSelect;

/*===== Reads =====*/
/** All applications, the waiting ones first, newest first within each. `id` narrows them to one. */
export async function findApplications({ db, id }: Executor & { id?: string }): Promise<PartnerApplicationRecord[]> {
  return db
    .select()
    .from(partnerApplication)
    .where(id ? eq(partnerApplication.id, id) : undefined)
    .orderBy(sql`${partnerApplication.status} = 'pending' desc`, desc(partnerApplication.createdAt));
}

/** The documents of these applications, oldest first. */
export async function findDocuments({
  db,
  applicationIds,
}: Executor & { applicationIds: string[] }): Promise<PartnerDocumentRecord[]> {
  if (applicationIds.length === 0) return [];
  return db
    .select()
    .from(partnerApplicationDocument)
    .where(inArray(partnerApplicationDocument.applicationId, applicationIds))
    .orderBy(asc(partnerApplicationDocument.createdAt), asc(partnerApplicationDocument.id));
}

/** One document, for the Admin's download route. */
export async function findDocument({ db, id }: Executor & { id: string }): Promise<PartnerDocumentRecord | undefined> {
  const [row] = await db.select().from(partnerApplicationDocument).where(eq(partnerApplicationDocument.id, id));
  return row;
}

/** How many applications came in since a moment: the public form's brake against a flood. */
export async function countApplicationsSince({ db, since }: Executor & { since: Date }): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(partnerApplication)
    .where(gt(partnerApplication.createdAt, since));
  return row?.count ?? 0;
}

/*===== Writes =====*/
/** Records the documents of a stored application (their bytes are already in the bucket). */
export async function insertDocuments({
  db,
  values,
}: Executor & { values: (typeof partnerApplicationDocument.$inferInsert)[] }): Promise<void> {
  if (values.length > 0) await db.insert(partnerApplicationDocument).values(values);
}
/**
 * Stores an application unless the number already has one waiting (a partial unique index decides, so two racing
 * submits still leave one).
 *
 * @returns The new id, or `undefined` when one is already waiting.
 */
export async function insertApplicationOnce({
  db,
  values,
}: Executor & { values: typeof partnerApplication.$inferInsert }): Promise<string | undefined> {
  const [row] = await db
    .insert(partnerApplication)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: partnerApplication.id });
  return row?.id;
}

/**
 * Answers a waiting application. Only a `pending` row changes, so an application is answered once.
 *
 * @returns Whether it was waiting (and is now answered).
 */
export async function answerApplication({
  db,
  id,
  values,
}: Executor & {
  id: string;
  values: Pick<typeof partnerApplication.$inferInsert, "status" | "rejectReason" | "partnerId" | "reviewedAt">;
}): Promise<boolean> {
  const rows = await db
    .update(partnerApplication)
    .set(values)
    .where(and(eq(partnerApplication.id, id), eq(partnerApplication.status, "pending")))
    .returning({ id: partnerApplication.id });
  return rows.length > 0;
}
