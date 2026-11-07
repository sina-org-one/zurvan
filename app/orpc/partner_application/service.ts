import { randomUUID } from "node:crypto";

import type { Database, DatabaseOrTransaction } from "~/db/client.server";
import { env } from "~/env.server";
import { formatNumber } from "~/lib/locale-format";
import { findAdminPhoneNumber, notify } from "~/lib/notify.server";
import { PARTNER_TERMS_VERSION } from "~/lib/partner-terms";
import { issuesToErrorData } from "~/lib/schema-issues";
import { deleteObjects, partnerDocumentKey, putObject } from "~/lib/storage.server";
import { isUuid } from "~/lib/uuid";
import { insertConsent } from "~/orpc/consent/repository";
import { findUserRoleByPhone } from "~/orpc/partner/repository";
import { createPartnerAccount } from "~/orpc/partner/service";
import type { AdminPartnerApplication } from "~/orpc/partner_application/contract";
import {
  detectPartnerDocumentFormat,
  isPartnerDocumentFormat,
  PARTNER_DOCUMENT_CONTENT_TYPES,
  PARTNER_DOCUMENT_MAX,
  PARTNER_DOCUMENT_MAX_BYTES,
  PARTNER_DOCUMENT_MIN,
  PARTNER_DOCUMENT_SNIFF_BYTES,
  type PartnerDocumentFormat,
} from "~/orpc/partner_application/documents";
import {
  answerApplication,
  countApplicationsSince,
  findApplications,
  findDocuments,
  insertApplicationOnce,
  insertDocuments,
  type PartnerApplicationRecord,
  type PartnerDocumentRecord,
} from "~/orpc/partner_application/repository";
import { applyInputSchema, rejectReasonSchema } from "~/orpc/partner_application/validation";
import { m } from "~/paraglide/messages";

/*===== Types =====*/
// docs/app-spec.md, F7, "Becoming a partner".

type InvalidResult = { kind: "invalid"; errors: string[]; fields: Record<string, string> };
type NotFoundResult = { kind: "not-found" };
type NotAnswerableResult = { kind: "not-answerable" };

/*===== Limits =====*/
// The form is public (no account yet), so a flood is held off here: past this many applications in an hour, the next
// ones are asked to try later. Generous for real use; one waiting application per number is the other brake.
const APPLICATIONS_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

/*===== Mapper =====*/
function toAdminApplication({
  record,
  documents,
}: {
  record: PartnerApplicationRecord;
  documents: PartnerDocumentRecord[];
}): AdminPartnerApplication {
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
    documents: documents.flatMap((document) =>
      isPartnerDocumentFormat(document.format)
        ? [{ id: document.id, format: document.format, sizeBytes: document.sizeBytes, fileName: document.fileName }]
        : [],
    ),
    termsVersion: record.termsVersion,
    termsAcceptedAt: record.termsAcceptedAt,
    status: record.status as AdminPartnerApplication["status"],
    rejectReason: record.rejectReason,
    partnerId: record.partnerId,
    reviewedAt: record.reviewedAt,
    createdAt: record.createdAt,
  };
}

/** Applications with their documents: two queries, however many applications. */
async function withDocuments({
  db,
  records,
}: {
  db: DatabaseOrTransaction;
  records: PartnerApplicationRecord[];
}): Promise<AdminPartnerApplication[]> {
  const documents = await findDocuments({ db, applicationIds: records.map((record) => record.id) });
  return records.map((record) =>
    toAdminApplication({ record, documents: documents.filter((document) => document.applicationId === record.id) }),
  );
}

async function readBack({ db, id }: { db: DatabaseOrTransaction; id: string }): Promise<AdminPartnerApplication> {
  const [application] = await withDocuments({ db, records: await findApplications({ db, id }) });
  if (!application) throw new Error(`partner application ${id} could not be read back`);
  return application;
}

/*===== Documents =====*/
type CheckedDocument = { id: string; format: PartnerDocumentFormat; body: Buffer; fileName: string };

/**
 * Checks the papers the visitor sent: how many, how big, and what they really are (by their bytes, never their name).
 * The form's message is the first problem found.
 */
async function checkDocuments(
  files: readonly File[],
): Promise<{ kind: "ok"; documents: CheckedDocument[] } | { kind: "invalid"; message: string }> {
  if (files.length < PARTNER_DOCUMENT_MIN) {
    return { kind: "invalid", message: m.server_partner_apply_documents_required() };
  }
  if (files.length > PARTNER_DOCUMENT_MAX) {
    return {
      kind: "invalid",
      message: m.server_partner_apply_documents_too_many({ count: formatNumber(PARTNER_DOCUMENT_MAX) }),
    };
  }

  const documents: CheckedDocument[] = [];
  for (const file of files) {
    if (file.size === 0 || file.size > PARTNER_DOCUMENT_MAX_BYTES) {
      return {
        kind: "invalid",
        message: m.server_partner_apply_documents_too_big({
          megabytes: formatNumber(PARTNER_DOCUMENT_MAX_BYTES / 1024 / 1024),
        }),
      };
    }
    const body = Buffer.from(await file.arrayBuffer());
    const format = detectPartnerDocumentFormat(new Uint8Array(body.subarray(0, PARTNER_DOCUMENT_SNIFF_BYTES)));
    if (!format) return { kind: "invalid", message: m.server_partner_apply_documents_format() };
    documents.push({ id: randomUUID(), format, body, fileName: file.name.slice(0, 120) });
  }
  return { kind: "ok", documents };
}

/** Deletes stored bytes no row points at. A failure is logged: it only leaves an unused object behind. */
async function discardObjects(keys: string[]): Promise<void> {
  try {
    await deleteObjects({ keys });
  } catch (error) {
    console.error("[partner application] could not delete unused documents", error);
  }
}

/*===== Apply =====*/
type ApplyResult = { kind: "success"; id: string } | InvalidResult;

/**
 * A visitor asks to become a partner, with the papers that show their business (at least one). Nobody needs to be
 * signed in. A customer's number may apply (a partner can be a customer too, the owner 2026-11-07: approving it makes
 * that account a partner's); a partner's or the Admin's can't, and neither can a number with an application waiting.
 * The terms they ticked are recorded with the version in force. The documents are stored privately. The Admin is texted.
 */
export async function applyForPartnership({
  db,
  input,
  now = new Date(),
}: {
  db: Database;
  input: { documents: readonly File[] } & Record<string, unknown>;
  now?: Date;
}): Promise<ApplyResult> {
  /*------ Validate ------*/
  const { documents: files, ...fields } = input;
  const parsed = applyInputSchema.safeParse(fields);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };
  const { acceptTerms: _accepted, ...values } = parsed.data;

  const checked = await checkDocuments(files);
  if (checked.kind === "invalid") return { kind: "invalid", errors: [], fields: { documents: checked.message } };

  const role = await findUserRoleByPhone({ db, phoneNumber: values.phoneNumber });
  if (role && role !== "customer") {
    return { kind: "invalid", errors: [], fields: { phoneNumber: m.server_partner_apply_phone_taken() } };
  }

  if ((await countApplicationsSince({ db, since: new Date(now.getTime() - HOUR_MS) })) >= APPLICATIONS_PER_HOUR) {
    return { kind: "invalid", errors: [m.server_partner_apply_busy()], fields: {} };
  }

  /*------ Store ------*/
  // The bytes go in first (private: the media route never serves this prefix); if the row can't be written they are
  // taken back out, so a refused application leaves nothing behind.
  const stored = checked.documents.map((document) => ({
    ...document,
    key: partnerDocumentKey({ documentId: document.id, format: document.format }),
  }));
  const keys = stored.map((document) => document.key);
  await Promise.all(
    stored.map((document) =>
      putObject({
        key: document.key,
        body: document.body,
        contentType: PARTNER_DOCUMENT_CONTENT_TYPES[document.format],
        cacheControl: "private, no-store",
      }),
    ),
  );

  let id: string | undefined;
  try {
    id = await db.transaction(async (tx) => {
      const applicationId = await insertApplicationOnce({
        db: tx,
        values: { ...values, termsVersion: PARTNER_TERMS_VERSION, termsAcceptedAt: now },
      });
      if (!applicationId) return undefined;
      await insertDocuments({
        db: tx,
        values: stored.map((document) => ({
          id: document.id,
          applicationId,
          format: document.format,
          sizeBytes: document.body.length,
          fileName: document.fileName,
        })),
      });
      return applicationId;
    });
  } catch (error) {
    await discardObjects(keys);
    throw error;
  }
  if (!id) {
    await discardObjects(keys);
    return { kind: "invalid", errors: [], fields: { phoneNumber: m.server_partner_apply_pending() } };
  }

  await notify({
    phoneNumber: await findAdminPhoneNumber({ db }),
    kind: "partner-applied",
    body: `زروان: درخواست همکاری تازه از ${values.businessName}. بررسیش کن.\n${env.BETTER_AUTH_URL}/admin/partners?view=applications`,
  });
  return { kind: "success", id };
}

/*===== Admin =====*/
export async function adminListApplications({ db }: { db: DatabaseOrTransaction }): Promise<AdminPartnerApplication[]> {
  return withDocuments({ db, records: await findApplications({ db }) });
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
