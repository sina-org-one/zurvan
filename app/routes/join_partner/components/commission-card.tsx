import { CommissionStairs } from "~/components/commission-stairs";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import type { CommissionTier } from "~/lib/business-rules";
import { m } from "~/paraglide/messages";

/*===== Commission Card =====*/
/**
 * The commission rules, as a raised grained plate at the end of the page's middle row. Under the heading, the steps as
 * the staircase every page draws them with: the steps are the Admin's setting (read by the page's loader), so changing
 * them there changes them here. Payment happens outside the app: the plate says so, and the app only records whether it
 * has been paid.
 *
 * The dog with the basket walks along the plate's top edge at its end corner (a purchase), a bush either side
 * and a pool of warm light; he carries no bubble. His sides are physical: he is in the plate's left corner and his
 * picture looks to the right, at the words. The section's top padding is his headroom, and the same as the steps
 * board's beside it, so the two plates line up.
 *
 * @param tiers The commission steps in force (the Admin's setting).
 */
export function CommissionCard({ tiers }: { tiers: readonly CommissionTier[] }) {
  return (
    <section aria-labelledby="commission-title" className="relative flex flex-col pt-44 lg:pt-48">
      {/*------ Sky over the plate's headroom, beside the dog ------*/}
      <NightSky className="inset-x-0 top-6 h-24 lg:top-4 lg:h-28" />

      <div className="relative flex flex-1 flex-col rounded-4xl border border-border bg-card paper-grain p-6 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.9)] sm:p-8">
        {/*------ The Dog on the Top Edge ------*/}
        <div aria-hidden className="absolute bottom-[calc(100%-0.2rem)] left-8 z-10 w-28 lg:w-32">
          <div className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_55%,rgb(255_194_26/0.08),transparent)]" />
          <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[88%] w-[40%] translate-y-[4%]" />
          <MascotCut
            name="plants"
            className="lively-sway-2 absolute right-[88%] bottom-0 w-[46%] translate-y-[4%] -scale-x-100"
          />
          <MascotCut name="basket" className="lively-wiggle-late relative block w-full translate-y-[3%]" />
        </div>

        {/*------ Heading and the Steps ------*/}
        <h2 id="commission-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
          {m.join_partner_commission_title()}
        </h2>
        <CommissionStairs tiers={tiers} className="mt-5" />

        {/*------ The Rules ------*/}
        <ul className="mt-6 flex flex-1 flex-col">
          <CommissionItem>{m.join_partner_commission_rule_total()}</CommissionItem>
          <CommissionItem>{m.join_partner_commission_rule_steps()}</CommissionItem>
          <CommissionItem>{m.join_partner_commission_rule_paid()}</CommissionItem>
          <CommissionItem>{m.join_partner_commission_rule_no_purchase()}</CommissionItem>
        </ul>
      </div>
    </section>
  );
}

/** One line of the list, with a gold dot at its start and a hairline above all but the first. */
function CommissionItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex flex-1 items-center gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
      <span className="text-pretty">{children}</span>
    </li>
  );
}
