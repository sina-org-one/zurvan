import { z } from "zod";

import { PARTNER_BUSINESS_TYPES } from "~/lib/partner-terms";
import { phoneNumberSchema } from "~/orpc/partner/validation";
import { m } from "~/paraglide/messages";

/*===== Application =====*/
// The public form, so its messages are the visitor's language (functions, worded per request).
export const APPLICATION_TEXT_MAX_LENGTH = 60;
export const APPLICATION_NOTE_MAX_LENGTH = 500;

const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: () => m.server_partner_apply_required() })
    .max(max);

const optionalText = (max: number) => z.string().trim().max(max);

/** The application as the service accepts it. */
export const applyInputSchema = z.object({
  firstName: requiredText(APPLICATION_TEXT_MAX_LENGTH),
  lastName: requiredText(APPLICATION_TEXT_MAX_LENGTH),
  phoneNumber: phoneNumberSchema,
  businessName: requiredText(APPLICATION_TEXT_MAX_LENGTH),
  businessType: z.enum(PARTNER_BUSINESS_TYPES, { error: () => m.server_partner_apply_business_type() }),
  address: requiredText(APPLICATION_NOTE_MAX_LENGTH),
  note: optionalText(APPLICATION_NOTE_MAX_LENGTH),
  marketerName: optionalText(APPLICATION_TEXT_MAX_LENGTH),
  acceptTerms: z.literal(true, { error: () => m.server_partner_apply_terms() }),
});

/** The Admin's reason for rejecting, texted to the applicant (Persian: the Admin's own words). */
export const rejectReasonSchema = z
  .string()
  .trim()
  .min(1, "دلیل رد رو بنویس؛ برای متقاضی پیامک می‌شه.")
  .max(APPLICATION_NOTE_MAX_LENGTH);
