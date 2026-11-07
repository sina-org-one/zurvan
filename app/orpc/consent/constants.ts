/*===== Consent Constants =====*/
// Browser-safe values shared by the API and the pages. docs/app-spec.md, F13.

/**
 * What a person can agree to. `site-rules` and `partner-terms` (the partnership's terms, `app/lib/partner-terms.ts`) are
 * the account's own; `public-logbook` is given per dog (F14).
 */
export const CONSENT_KINDS = ["site-rules", "public-logbook", "partner-terms"] as const;

export type ConsentKind = (typeof CONSENT_KINDS)[number];
