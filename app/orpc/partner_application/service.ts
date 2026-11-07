import type { Database, DatabaseOrTransaction } from "~/db/client.server";
import { env } from "~/env.server";
import { findAdminPhoneNumber, notify } from "~/lib/notify.server";
import { PARTNER_TERMS_VERSION } from "~/lib/partner-terms";
import { issuesToErrorData } from "~/lib/schema-issues";
import { isUuid } from "~/lib/uuid";
import { insertConsent } from "~/orpc/consent/repository";
import { findUserIdByPhone } from "~/orpc/partner/repository";
import { createPartnerAccount } from "~/orpc/partner/service";
import type { AdminPartnerApplication } from "~/orpc/partner_application/contract";
import {
  answerApplication,
  findApplications,
  insertApplicationOnce,
  type PartnerApplicationRecord,
} from "~/orpc/partner_application/repository";
import { applyInputSchema, rejectReasonSchema } from "~/orpc/partner_application/validation";
import { m } from "~/paraglide/messages";

/*===== Types =====*/
// docs/app-spec.md, F7, "Becoming a partner".

type InvalidResult = { kind: "invalid"; errors: string[]; fields: Record<string, string> };
type NotFoundResult = { kind: "not-found" };
type NotAnswerableResult = { kind: "not-answerable" };

/*===== Mapper =====*/
function toAdminApplication(record: PartnerApplicationRecord): AdminPartnerApplication {
  return {
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    phoneNumber: record.phoneNumber,
    businessName: record.businessName,
    businessType: record.businessType,
    address: record.address,
    note: record.note,
    marketerName: record.marketerName,
    termsVersion: record.termsVersion,
    termsAcceptedAt: record.termsAcceptedAt,
    status: record.status as AdminPartnerApplication["status"],
    rejectReason: record.rejectReason,
    partnerId: record.partnerId,
    reviewedAt: record.reviewedAt,
    createdAt: record.createdAt,
  };
}

async function readBack({ db, id }: { db: DatabaseOrTransaction; id: string }): Promise<AdminPartnerApplication> {
  const [record] = await findApplications({ db, id });
  if (!record) throw new Error(`partner application ${id} could not be read back`);
  return toAdminApplication(record);
}

/*===== Apply =====*/
type ApplyResult = { kind: "success"; id: string } | InvalidResult;

/**
 * A visitor asks to become a partner. Nobody is signed in, so the number is only the one they will sign in with once
 * approved: a number that already has an account is refused (one role per number), and so is a second application while
 * one is waiting. The terms they ticked are recorded with the version in force. The Admin is texted.
 */
export async function applyForPartnership({
  db,
  input,
  now = new Date(),
}: {
  db: DatabaseOrTransaction;
  input: unknown;
  now?: Date;
}): Promise<ApplyResult> {
  /*------ Validate ------*/
  const parsed = applyInputSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };
  const { acceptTerms: _accepted, ...values } = parsed.data;

  if (await findUserIdByPhone({ db, phoneNumber: values.phoneNumber })) {
    return { kind: "invalid", errors: [], fields: { phoneNumber: m.server_partner_apply_phone_taken() } };
  }

  /*------ Store ------*/
  const id = await insertApplicationOnce({
    db,
    values: { ...values, termsVersion: PARTNER_TERMS_VERSION, termsAcceptedAt: now },
  });
  if (!id) return { kind: "invalid", errors: [], fields: { phoneNumber: m.server_partner_apply_pending() } };

  await notify({
    phoneNumber: await findAdminPhoneNumber({ db }),
    kind: "partner-applied",
    body: `زروان: درخواست همکاری تازه از ${values.businessName}. بررسیش کن.\n${env.BETTER_AUTH_URL}/admin/partners?view=applications`,
  });
  return { kind: "success", id };
}

/*===== Admin =====*/
export async function adminListApplications({ db }: { db: DatabaseOrTransaction }): Promise<AdminPartnerApplication[]> {
  return (await findApplications({ db })).map(toAdminApplication);
}

type AnswerResult =
  { kind: "success"; application: AdminPartnerApplication } | InvalidResult | NotFoundResult | NotAnswerableResult;

/** Thrown inside the transaction to undo the account when the application was answered meanwhile. */
class RollbackApprove extends Error {}

/**
 * Approves a waiting application: creates the partner's account (the application's name, number and business, a
 * generated link code), copies the terms' acceptance into `consent` with its original time and version, and marks the
 * application approved, all in one transaction. The applicant is texted that they can sign in.
 */
export async function approveApplication({
  db,
  id,
  now = new Date(),
}: {
  db: Database;
  id: string;
  now?: Date;
}): Promise<AnswerResult> {
  if (!isUuid(id)) return { kind: "not-found" };
  const [record] = await findApplications({ db, id });
  if (!record) return { kind: "not-found" };
  if (record.status !== "pending") return { kind: "not-answerable" };

  /*------ Create the account ------*/
  let outcome: AnswerResult | { kind: "created" };
  try {
    outcome = await db.transaction(async (tx) => {
      const created = await createPartnerAccount({
        db: tx,
        firstName: record.firstName,
        lastName: record.lastName,
        phoneNumber: record.phoneNumber,
        business: { businessName: record.businessName, businessType: record.businessType },
      });
      if (created.kind === "invalid") return created;

      await insertConsent({
        db: tx,
        userId: created.id,
        kind: "partner-terms",
        version: record.termsVersion,
        acceptedAt: record.termsAcceptedAt,
      });
      const answered = await answerApplication({
        db: tx,
        id,
        values: { status: "approved", partnerId: created.id, reviewedAt: now },
      });
      if (!answered) throw new RollbackApprove();
      return { kind: "created" as const };
    });
  } catch (error) {
    if (error instanceof RollbackApprove) return { kind: "not-answerable" };
    throw error;
  }
  if (outcome.kind !== "created") return outcome;

  /*------ Tell them ------*/
  await notify({
    phoneNumber: record.phoneNumber,
    kind: "partner-approved",
    body: `زروان: درخواست همکاری ${record.businessName} تأیید شد! با همین شماره از «ورود همکار» وارد شو.\n${env.BETTER_AUTH_URL}/auth?as=partner`,
  });
  return { kind: "success", application: await readBack({ db, id }) };
}

/** Rejects a waiting application with the Admin's reason, which is texted to the applicant. They may apply again. */
export async function rejectApplication({
  db,
  id,
  reason,
  now = new Date(),
}: {
  db: DatabaseOrTransaction;
  id: string;
  reason: string;
  now?: Date;
}): Promise<AnswerResult> {
  const parsed = rejectReasonSchema.safeParse(reason);
  if (!parsed.success)
    return { kind: "invalid", errors: [], fields: { reason: parsed.error.issues[0]?.message ?? "" } };
  if (!isUuid(id)) return { kind: "not-found" };

  const [record] = await findApplications({ db, id });
  if (!record) return { kind: "not-found" };

  const answered = await answerApplication({
    db,
    id,
    values: { status: "rejected", rejectReason: parsed.data, reviewedAt: now },
  });
  if (!answered) return { kind: "not-answerable" };

  await notify({
    phoneNumber: record.phoneNumber,
    kind: "partner-rejected",
    body: `زروان: درخواست همکاری ${record.businessName} فعلاً تأیید نشد. دلیل: ${parsed.data}`,
  });
  return { kind: "success", application: await readBack({ db, id }) };
}
