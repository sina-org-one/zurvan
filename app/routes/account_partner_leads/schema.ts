import { z } from "zod";

import { normalizePhoneNumber } from "~/lib/phone";
import { LEAD_AGE_MAX_LENGTH, LEAD_TEXT_MAX_LENGTH } from "~/orpc/partner/lead-limits";
import { m } from "~/paraglide/messages";

/*===== Add Lead =====*/
// The messages say what the server answers with (`server_partner_…`), so a typo or a blank is caught before the request
// and reads the same either way. They are read when validation runs, never at import, so they follow the page's
// language. The server stays the authority: it also knows who already has an account.
//
// The guardian's name and the dog's name, breed and age are required with every number (the owner, 2026-11-06), so a
// lead is a real person the partner talked to, not a bank of numbers.

const detail = ({ max, required }: { max: number; required: () => string }) =>
  z
    .string()
    .trim()
    .min(1, { error: required })
    .max(max, { error: () => m.account_partner_leads_form_too_long() });

export const addLeadFormSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => normalizePhoneNumber(value) !== null, {
      error: () => m.account_partner_leads_form_phone_invalid(),
    }),
  guardianName: detail({ max: LEAD_TEXT_MAX_LENGTH, required: () => m.account_partner_leads_form_guardian_required() }),
  dogName: detail({ max: LEAD_TEXT_MAX_LENGTH, required: () => m.account_partner_leads_form_dog_name_required() }),
  dogBreed: detail({ max: LEAD_TEXT_MAX_LENGTH, required: () => m.account_partner_leads_form_dog_breed_required() }),
  dogAge: detail({ max: LEAD_AGE_MAX_LENGTH, required: () => m.account_partner_leads_form_dog_age_required() }),
});

export type AddLeadFormValues = z.infer<typeof addLeadFormSchema>;

export const EMPTY_LEAD: AddLeadFormValues = {
  phoneNumber: "",
  guardianName: "",
  dogName: "",
  dogBreed: "",
  dogAge: "",
};

/** The four details in the order the form shows them. */
export const LEAD_DETAIL_FIELDS = ["guardianName", "dogName", "dogBreed", "dogAge"] as const;
