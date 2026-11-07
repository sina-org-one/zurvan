import { z } from "zod";

/*===== Constants =====*/
/**
 * The views, in the order the pills show. «unpaid» first: paying is what he comes here to do. «applications» is who
 * asked to become a partner on `/join/partner`.
 */
export const PARTNER_VIEWS = ["unpaid", "paid", "partners", "applications"] as const;

export type PartnerView = (typeof PARTNER_VIEWS)[number];

/** The view an absent `?view=` means; links leave it out of the URL. */
export const DEFAULT_PARTNER_VIEW = "unpaid" satisfies PartnerView;

/*===== Search Schema =====*/
// None is a loader dep: the loader fetches both lists once and the page filters them, so a change never needs a loader
// run. `partner` (the open drawer) and `new` (the create sheet) are pushed as history entries so Back closes them;
// absent means closed. `new` is the number 1 (`?new=1`). A hand-typed bad value is dropped (`.catch`) instead of
// failing the page.
export const adminPartnersSearchSchema = z.object({
  view: z.enum(PARTNER_VIEWS).optional().catch(undefined),
  partner: z.string().optional().catch(undefined),
  new: z.literal(1).optional().catch(undefined),
});

export type AdminPartnersSearch = z.infer<typeof adminPartnersSearchSchema>;
