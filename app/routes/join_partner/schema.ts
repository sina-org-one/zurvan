import { z } from "zod";

import { PARTNER_BUSINESS_TYPES } from "~/lib/partner-terms";
import { normalizePhoneNumber } from "~/lib/phone";
import { m } from "~/paraglide/messages";

/*===== Apply Form =====*/
// The same checks the server makes (`app/orpc/partner_application/validation.ts`), worded the same, so a blank or a typo
// is caught before the request. Read when validation runs, so they follow the page's language. The server stays the
// authority: it also knows which numbers already have an account or an application waiting.

const required = z
  .string()
  .trim()
  .min(1, { error: () => m.join_partner_apply_required() });

export const applyFormSchema = z.object({
  firstName: required,
  lastName: required,
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => normalizePhoneNumber(value) !== null, { error: () => m.join_partner_apply_phone_invalid() }),
  businessName: required,
  // `""` is the select's «انتخاب کن» row.
  businessType: z.union([z.enum(PARTNER_BUSINESS_TYPES), z.literal("")]).refine((value) => value !== "", {
    error: () => m.join_partner_apply_business_type_required(),
  }),
  address: required,
  marketerName: z.string().trim(),
  note: z.string().trim(),
  acceptTerms: z.boolean().refine((value) => value, { error: () => m.partner_terms_accept_required() }),
});

export type ApplyFormValues = z.input<typeof applyFormSchema>;

export const EMPTY_APPLICATION: ApplyFormValues = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  businessName: "",
  businessType: "",
  address: "",
  marketerName: "",
  note: "",
  acceptTerms: false,
};
