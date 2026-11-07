import { oc } from "@orpc/contract";
import { z } from "zod";

import { qrLinkSchema } from "~/lib/qr";
import { commonErrors, errorDataSchema } from "~/orpc/errors";
import { authErrors, roleErrors } from "~/orpc/middleware/auth/auth.errors";
import { commissionTierSchema } from "~/orpc/setting/contract";

/*===== Schemas =====*/
/** A partner's own profile row. Only the Sheba is theirs to edit (F1); the name is the user's (Better-Auth). */
export const partnerProfileSchema = z.object({
  /** Normalized `IR` + 24 digits, or null until the partner has written it. */
  shebaNumber: z.string().nullable(),
  /** In the referral link: `?ref=<code>`. Never changes after the Admin creates the account. */
  code: z.string(),
  /** An inactive partner's link and leads attribute no one (F7). */
  isActive: z.boolean(),
  /** The commission steps in force now (setting, else the default); a commission keeps the percent it was written with. */
  commissionTiers: z.array(commissionTierSchema),
  /** How many distinct customers have earned this partner a commission: the count the steps are read against. */
  payingCustomers: z.number().int(),
  /**
   * The partnership terms in force (`app/lib/partner-terms.ts`) and whether this partner accepted exactly that version.
   * Until they have, the dashboard shows the terms first and no customer can be entered.
   */
  terms: z.object({ version: z.string(), accepted: z.boolean() }),
});

export type PartnerProfile = z.infer<typeof partnerProfileSchema>;

/** The profile as the partner opens it, with their referral link (`/?ref=<code>`) and that link as a QR code. */
export const myPartnerProfileSchema = partnerProfileSchema.extend(qrLinkSchema.shape);

/**
 * Where a person stands on the road (F7): `lead` (the number is entered, nobody has signed up with it), `registered`
 * (a customer attributed to this partner), `bought` (a paid purchase of theirs wrote a commission), or `lost` (the
 * number or customer went to someone else: another partner's earlier lead, or a referral link).
 */
export const PARTNER_PERSON_STAGES = ["lead", "registered", "bought", "lost"] as const;

export type PartnerPersonStage = (typeof PARTNER_PERSON_STAGES)[number];

/** A phone lead, or a customer the partner's link brought, as the partner who owns it sees it (F12): never prices, dogs or other partners. */
/** Who a phone lead is about, as the partner wrote it with the number (empty strings on leads from before these). */
export const leadDetailsSchema = z.object({
  guardianName: z.string(),
  dogName: z.string(),
  dogBreed: z.string(),
  dogAge: z.string(),
});

export type LeadDetails = z.infer<typeof leadDetailsSchema>;

export const partnerPersonSchema = z.object({
  /** The lead's id, or the customer's user id for a link customer. */
  id: z.string(),
  source: z.enum(["phone", "link"]),
  /** What the partner typed; null for a link customer. */
  phoneNumber: z.string().nullable(),
  /** The guardian and dog the partner wrote with the number; null for a link customer. The partner's own words. */
  details: leadDetailsSchema.nullable(),
  /** Set from `registered` on; null for `lead` and `lost` (a lost customer is not this partner's to see). */
  customerName: z.string().nullable(),
  stage: z.enum(PARTNER_PERSON_STAGES),
  /** When the lead was entered; for a link customer, when they registered. */
  createdAt: z.date(),
  registeredAt: z.date().nullable(),
  /** When the customer's first commission was written. */
  boughtAt: z.date().nullable(),
  /**
   * What this partner has earned from the person, once `bought`, over all their purchases (Rial): the total, the part
   * the Admin hasn't paid yet, and when she last paid one (null while none is paid). Null before that and for a `lost`
   * person. Never the purchases' prices or what was bought.
   */
  commission: z
    .object({ amount: z.number().int(), unpaidAmount: z.number().int(), paidAt: z.date().nullable() })
    .nullable(),
});

export type PartnerPerson = z.infer<typeof partnerPersonSchema>;

/** A partner as the Admin sees him: contact, Sheba, counts by stage, what he is owed, and his people. */
export const adminPartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNumber: z.string().nullable(),
  code: z.string(),
  shebaNumber: z.string().nullable(),
  isActive: z.boolean(),
  /**
   * `partner` (a business), or `customer` for a customer who refers friends (F7, the owner 2026-11-07): the same
   * referral row, steps and gifts, paid the same way.
   */
  role: z.enum(["partner", "customer"]),
  /** From the application; null for a partner added by hand. */
  businessName: z.string().nullable(),
  businessType: z.string().nullable(),
  /** When he accepted the partnership terms in force; null while he hasn't. */
  termsAcceptedAt: z.date().nullable(),
  createdAt: z.date(),
  /** People by stage (not cumulative: a `bought` person is not counted as `registered`). */
  counts: z.object({
    lead: z.number().int(),
    registered: z.number().int(),
    bought: z.number().int(),
    lost: z.number().int(),
  }),
  /** Rial. */
  commissions: z.object({
    unpaidCount: z.number().int(),
    unpaidAmount: z.number().int(),
    paidCount: z.number().int(),
    paidAmount: z.number().int(),
  }),
  people: z.array(partnerPersonSchema),
});

export type AdminPartner = z.infer<typeof adminPartnerSchema>;

/*===== Errors =====*/
const notFoundError = {
  // A partner user with no `partner` row, or an id that is no partner.
  NOT_FOUND: {
    message: "Not found.",
    data: errorDataSchema,
  },
};

const baseErrors = { ...commonErrors, ...authErrors, ...roleErrors };

/*===== Procedures =====*/
export const getMyPartnerProfileContract = oc
  .errors({ ...baseErrors, ...notFoundError })
  .output(myPartnerProfileSchema);

/**
 * The input is the raw text as typed: the server normalizes it (spaces, Persian digits, case) and checks the format and
 * the checksum. A bad number is `INVALID_INPUT` with the message in `data.fields.shebaNumber`.
 */
export const updateMyPartnerProfileContract = oc
  .errors({ ...baseErrors, ...notFoundError })
  .input(z.strictObject({ shebaNumber: z.string() }))
  .output(partnerProfileSchema);

/** The partner's own people, newest `createdAt` first. */
export const listMyLeadsContract = oc.errors({ ...baseErrors, ...notFoundError }).output(z.array(partnerPersonSchema));

/**
 * The input is the number and the four details as typed. Every refusal is `INVALID_INPUT` so the form can show it
 * inline: `fields.<name>` for a bad or missing value, a number that already has an account, or one the partner already
 * entered; `errors` for an inactive partner or one who hasn't accepted the terms in force.
 */
export const addLeadContract = oc
  .errors({ ...baseErrors, ...notFoundError })
  .input(
    z.strictObject({
      phoneNumber: z.string(),
      guardianName: z.string(),
      dogName: z.string(),
      dogBreed: z.string(),
      dogAge: z.string(),
    }),
  )
  .output(partnerPersonSchema);

/**
 * Records that the signed-in partner accepted the terms **as published now**: the browser sends no version, so nobody
 * accepts text that isn't the current one. Again is the same as once.
 */
export const acceptMyTermsContract = oc.errors({ ...baseErrors, ...notFoundError }).output(partnerProfileSchema);

/**
 * Public: whether a number belongs to a partner account, asked by «ورود همکار» before it sends a sign-in code. A code
 * verified for an unknown number creates a customer account, and one role per number would then shut that person out
 * of becoming a partner, so the partner sign-in stops first and points to the application. It says only yes or no.
 */
export const isPartnerPhoneContract = oc
  .errors(commonErrors)
  .input(z.strictObject({ phoneNumber: z.string() }))
  .output(z.object({ isPartner: z.boolean() }));

export const adminListPartnersContract = oc.errors(baseErrors).output(z.array(adminPartnerSchema));

/**
 * Raw text as typed. `code` is optional (blank means generated). Refusals are `INVALID_INPUT`: `fields.phoneNumber` for a
 * bad number or any number that already has an account, `fields.code` for a bad or taken code.
 */
export const adminCreatePartnerContract = oc
  .errors(baseErrors)
  .input(
    z.strictObject({
      firstName: z.string(),
      lastName: z.string(),
      phoneNumber: z.string(),
      code: z.string().optional(),
    }),
  )
  .output(adminPartnerSchema);

/** Idempotent: setting the state a partner is already in succeeds. */
export const adminSetPartnerActiveContract = oc
  .errors({ ...baseErrors, ...notFoundError })
  .input(z.strictObject({ id: z.string(), isActive: z.boolean() }))
  .output(adminPartnerSchema);

export const partnerContract = {
  getMine: getMyPartnerProfileContract,
  updateMine: updateMyPartnerProfileContract,
  acceptTerms: acceptMyTermsContract,
  isPartnerPhone: isPartnerPhoneContract,
  leads: {
    list: listMyLeadsContract,
    add: addLeadContract,
  },
  admin: {
    list: adminListPartnersContract,
    create: adminCreatePartnerContract,
    setActive: adminSetPartnerActiveContract,
  },
};
