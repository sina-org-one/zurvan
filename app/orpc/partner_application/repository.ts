import { and, desc, eq, sql } from "drizzle-orm";

import type { DatabaseOrTransaction } from "~/db/client.server";
import { partnerApplication } from "~/db/schema";

/*===== Types =====*/
type Executor = { db: DatabaseOrTransaction };

export type PartnerApplicationRecord = typeof partnerApplication.$inferSelect;

/*===== Reads =====*/
/** All applications, the waiting ones first, newest first within each. `id` narrows them to one. */
export async function findApplications({ db, id }: Executor & { id?: string }): Promise<PartnerApplicationRecord[]> {
  return db
    .select()
    .from(partnerApplication)
    .where(id ? eq(partnerApplication.id, id) : undefined)
    .orderBy(sql`${partnerApplication.status} = 'pending' desc`, desc(partnerApplication.createdAt));
}

/*===== Writes =====*/
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
