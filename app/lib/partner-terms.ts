import { m } from "~/paraglide/messages";

/*===== Partner Terms =====*/
// The partnership's terms (the owner, 2026-11-06): every partner sees them and ticks «قوانین رو خوندم و قبول دارم»
// before working with Zurvan, on the application form (`/join/partner`) or, for a partner the Admin added by hand, on
// their dashboard before anything else. The acceptance is kept in `consent` (`partner-terms`) with this version.
//
// **The wording is a draft** written from the owner's rules for the partnership (a referral gift only for a real
// purchase; real customers with their guardian's and dog's details, never a bank of numbers). Give `PARTNER_TERMS_VERSION`
// a new value whenever the text changes: every partner is then asked to accept the new version on their dashboard, and
// can't add customers until they do.

/** A new value whenever the wording changes. Stored with each acceptance. */
export const PARTNER_TERMS_VERSION = "1405-08-15";

/** The terms in order, each a heading and its paragraphs, read while rendering so they're in the page's language. */
export function partnerTermsSections(): { heading: string; paragraphs: string[] }[] {
  return [
    { heading: m.partner_terms_what_heading(), paragraphs: [m.partner_terms_what_one()] },
    {
      heading: m.partner_terms_gift_heading(),
      paragraphs: [m.partner_terms_gift_one(), m.partner_terms_gift_two(), m.partner_terms_gift_three()],
    },
    {
      heading: m.partner_terms_customers_heading(),
      paragraphs: [m.partner_terms_customers_one(), m.partner_terms_customers_two(), m.partner_terms_customers_three()],
    },
    { heading: m.partner_terms_privacy_heading(), paragraphs: [m.partner_terms_privacy_one()] },
    { heading: m.partner_terms_promise_heading(), paragraphs: [m.partner_terms_promise_one()] },
    { heading: m.partner_terms_paying_heading(), paragraphs: [m.partner_terms_paying_one()] },
    { heading: m.partner_terms_stop_heading(), paragraphs: [m.partner_terms_stop_one()] },
    { heading: m.partner_terms_change_heading(), paragraphs: [m.partner_terms_change_one()] },
  ];
}

/*===== Business Types =====*/
/** What kind of place a partner has, as the application asks it. */
export const PARTNER_BUSINESS_TYPES = ["clinic", "groomer", "pet-shop", "kennel", "other"] as const;

export type PartnerBusinessType = (typeof PARTNER_BUSINESS_TYPES)[number];

export function isPartnerBusinessType(value: string): value is PartnerBusinessType {
  return (PARTNER_BUSINESS_TYPES as readonly string[]).includes(value);
}

/** The type's label in the page's language. */
export function partnerBusinessTypeLabel(type: PartnerBusinessType): string {
  switch (type) {
    case "clinic":
      return m.partner_terms_business_clinic();
    case "groomer":
      return m.partner_terms_business_groomer();
    case "pet-shop":
      return m.partner_terms_business_pet_shop();
    case "kennel":
      return m.partner_terms_business_kennel();
    case "other":
      return m.partner_terms_business_other();
  }
}
