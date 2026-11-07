import { oc } from "@orpc/contract";
import { z } from "zod";

import { commonErrors, errorDataSchema } from "~/orpc/errors";
import { PARTNER_DOCUMENT_FORMATS, PARTNER_DOCUMENT_MAX } from "~/orpc/partner_application/documents";
import { authErrors, roleErrors } from "~/orpc/middleware/auth/auth.errors";

/*===== Schemas =====*/
// A clinic, groomer or pet shop asking to become a partner (docs/app-spec.md, F7, "Becoming a partner").

export const PARTNER_APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;

export type PartnerApplicationStatus = (typeof PARTNER_APPLICATION_STATUSES)[number];

/** A paper sent with an application. Its bytes are read through `/api/partner-documents/{id}`, by the Admin only. */
export const partnerDocumentSchema = z.object({
  id: z.string(),
  format: z.enum(PARTNER_DOCUMENT_FORMATS),
  sizeBytes: z.number().int(),
  fileName: z.string(),
});

export type PartnerDocument = z.infer<typeof partnerDocumentSchema>;

/** An application as the Admin reviews it. */
export const adminPartnerApplicationSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string(),
  businessName: z.string(),
  /** One of `PARTNER_BUSINESS_TYPES` (`app/lib/partner-terms.ts`). */
  businessType: z.string(),
  address: z.string(),
  note: z.string(),
  marketerName: z.string(),
  /** The papers they sent (licence, permit, shopfront), oldest first. */
  documents: z.array(partnerDocumentSchema),
  termsVersion: z.string(),
  termsAcceptedAt: z.date(),
  status: z.enum(PARTNER_APPLICATION_STATUSES),
  rejectReason: z.string().nullable(),
  /** The account the approval created. */
  partnerId: z.string().nullable(),
  reviewedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type AdminPartnerApplication = z.infer<typeof adminPartnerApplicationSchema>;

/*===== Errors =====*/
const notFoundError = {
  NOT_FOUND: {
    message: "Not found.",
    data: errorDataSchema,
  },
};

/** Approving or rejecting an application that was already answered. */
const notAnswerableError = {
  NOT_ANSWERABLE: {
    message: "This application was already answered.",
    data: errorDataSchema,
  },
};

const adminErrors = { ...commonErrors, ...authErrors, ...roleErrors };

/*===== Procedures =====*/
/**
 * Public: anyone may apply, signed in or not. The input is raw text as typed; the server normalizes and checks it.
 * Refusals are `INVALID_INPUT` with `fields.<name>`: a missing value, a bad number, a number that already has an account
 * that is a partner's or the Admin's (a customer's may apply: a partner can be a customer too) or one with an
 * application waiting, `fields.acceptTerms` when the terms weren't ticked, `fields.documents` for missing, too many,
 * too big or unsupported papers, and `errors` when too many applications came in the last hour.
 */
export const submitApplicationContract = oc
  .errors(commonErrors)
  .input(
    z.strictObject({
      firstName: z.string(),
      lastName: z.string(),
      phoneNumber: z.string(),
      businessName: z.string(),
      businessType: z.string(),
      address: z.string(),
      note: z.string(),
      marketerName: z.string(),
      acceptTerms: z.boolean(),
      // Structure only: the count, size and real format are the service's checks (`fields.documents`).
      documents: z.array(z.file()).max(PARTNER_DOCUMENT_MAX),
    }),
  )
  .output(z.object({ id: z.string() }));

/** Every application, waiting ones first, then newest first. */
export const adminListApplicationsContract = oc.errors(adminErrors).output(z.array(adminPartnerApplicationSchema));

/**
 * Creates the partner's account from the application (a generated link code) and copies the terms' acceptance to it.
 * `INVALID_INPUT` (`fields.phoneNumber`) when the number has meanwhile got an account.
 */
export const adminApproveApplicationContract = oc
  .errors({ ...adminErrors, ...notFoundError, ...notAnswerableError })
  .input(z.strictObject({ id: z.string() }))
  .output(adminPartnerApplicationSchema);

/** The reason is texted to the applicant. */
export const adminRejectApplicationContract = oc
  .errors({ ...adminErrors, ...notFoundError, ...notAnswerableError })
  .input(z.strictObject({ id: z.string(), reason: z.string() }))
  .output(adminPartnerApplicationSchema);

export const partnerApplicationContract = {
  // Not `apply`: the browser client is a function proxy, and `apply` would resolve to `Function.prototype.apply`.
  submit: submitApplicationContract,
  admin: {
    list: adminListApplicationsContract,
    approve: adminApproveApplicationContract,
    reject: adminRejectApplicationContract,
  },
};
