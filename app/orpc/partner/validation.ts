import { z } from "zod";

import { formatNumberFa, toLatinDigits } from "~/lib/digits";
import { formatNumber } from "~/lib/locale-format";
import { LEAD_AGE_MAX_LENGTH, LEAD_TEXT_MAX_LENGTH } from "~/orpc/partner/lead-limits";
import { isNormalizedPhoneNumber, normalizePhoneNumber } from "~/lib/phone";
import { m } from "~/paraglide/messages";

/*===== Normalization =====*/
// Spaces (any kind), dashes and the zero-width non-joiner Persian keyboards add. Banks print Sheba numbers in groups.
const SEPARATORS = /[\s\-‐-―‌]/g;
const SHEBA_PATTERN = /^IR\d{24}$/;

/**
 * Turns what the partner typed into the stored form: Latin digits, no separators, uppercase, and the leading `IR` added
 * when the rest is 24 digits (many people copy the number without it). Anything else is left for the format check.
 */
export function normalizeShebaNumber(raw: string): string {
  const text = toLatinDigits(raw.trim()).replace(SEPARATORS, "").toUpperCase();
  return /^\d{24}$/.test(text) ? `IR${text}` : text;
}

/*===== Checksum =====*/
/**
 * ISO 7064 mod 97-10: the first four characters move to the end, letters become numbers (A=10 … Z=35, so I=18 and
 * R=27), and the remainder mod 97 must be 1. The remainder is carried digit by digit, as the number is far past what a
 * double holds exactly.
 */
export function hasValidShebaChecksum(sheba: string): boolean {
  if (!SHEBA_PATTERN.test(sheba)) return false;

  const digits = (sheba.slice(4) + sheba.slice(0, 4)).replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

/*===== Schema =====*/
// The format failure aborts, so a malformed number gets the format message and only a well-formed one reaches the
// checksum.
export const shebaNumberSchema = z
  .string()
  .transform(normalizeShebaNumber)
  .pipe(
    z
      .string()
      .regex(SHEBA_PATTERN, { error: () => m.server_partner_sheba_format(), abort: true })
      .refine(hasValidShebaChecksum, { error: () => m.server_partner_sheba_checksum() }),
  );

/**
 * The partner profile as the service accepts it. Messages are user-facing because they surface as field errors, and
 * are functions so each failure is worded in its own request's language (the partner pages have English ones).
 */
export const partnerProfileInputSchema = z.object({ shebaNumber: shebaNumberSchema });

/*===== Phone =====*/
/** What a partner typed, normalized to `09xxxxxxxxx` (Persian digits, spaces and `+98` are fine). */
export const phoneNumberSchema = z
  .string()
  .transform((value) => normalizePhoneNumber(value) ?? value)
  .refine(isNormalizedPhoneNumber, { error: () => m.server_partner_phone_invalid() });

/*===== Lead Details =====*/
// The guardian's and dog's details asked with every number (the owner, 2026-11-06), so a lead is a person the partner
// really talked to and not a bank of numbers. Free text: the partner writes what the customer told him.

const leadTextSchema = ({ max, required }: { max: number; required: () => string }) =>
  z
    .string()
    .trim()
    .min(1, { error: required })
    .max(max, { error: () => m.server_partner_lead_too_long({ count: formatNumber(max) }) });

/** A phone lead as the service accepts it. */
export const addLeadInputSchema = z.object({
  phoneNumber: phoneNumberSchema,
  guardianName: leadTextSchema({
    max: LEAD_TEXT_MAX_LENGTH,
    required: () => m.server_partner_lead_guardian_required(),
  }),
  dogName: leadTextSchema({ max: LEAD_TEXT_MAX_LENGTH, required: () => m.server_partner_lead_dog_name_required() }),
  dogBreed: leadTextSchema({ max: LEAD_TEXT_MAX_LENGTH, required: () => m.server_partner_lead_dog_breed_required() }),
  dogAge: leadTextSchema({ max: LEAD_AGE_MAX_LENGTH, required: () => m.server_partner_lead_dog_age_required() }),
});

/*===== New Partner =====*/
// The Admin's form, so its own messages stay Persian (the Admin has no English pages).
export const PARTNER_NAME_MAX_LENGTH = 40;
export const PARTNER_CODE_FORMAT_MESSAGE = "کد فقط حرف کوچیک انگلیسی، رقم و خط تیره می‌گیره و باید ۳ تا ۳۲ نویسه باشه.";

const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} رو بنویس.`)
    .max(PARTNER_NAME_MAX_LENGTH, `${label} حداکثر ${formatNumberFa(PARTNER_NAME_MAX_LENGTH)} حرف می‌تونه باشه.`);

// Blank means "generate one". The code is matched case-sensitively by the referral cookie and printed on a card and a
// QR, so an uppercase code is refused instead of silently lowercased.
const codeSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() || undefined)
  .pipe(
    z
      .string()
      .regex(/^[a-z0-9-]{3,32}$/, PARTNER_CODE_FORMAT_MESSAGE)
      .optional(),
  );

/** The Admin's form for a new partner account, as the service accepts it. */
export const createPartnerInputSchema = z.object({
  firstName: nameSchema("نام"),
  lastName: nameSchema("نام خانوادگی"),
  phoneNumber: phoneNumberSchema,
  code: codeSchema,
});

export type CreatePartnerInput = z.output<typeof createPartnerInputSchema>;
