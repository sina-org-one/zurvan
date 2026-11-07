import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "~/lib/seo";
import { orNotFound } from "~/lib/not-found";
import { requireSession } from "~/lib/session-guard";
import { orpc } from "~/orpc/client";
import { m } from "~/paraglide/messages";
import type { PartnerCommission } from "~/orpc/commission/contract";
import type { PartnerPerson } from "~/orpc/partner/contract";
import { COLUMN } from "~/routes/account_partner/column";
import { CommissionPlate } from "~/routes/account_partner/components/commission-plate";
import { FunnelPlate } from "~/routes/account_partner/components/funnel-plate";
import { PageMotion } from "~/routes/account_partner/components/page-motion";
import { PartnerError } from "~/routes/account_partner/components/partner-error";
import { PartnerHero } from "~/routes/account_partner/components/partner-hero";
import { PartnerNotices } from "~/routes/account_partner/components/partner-notices";
import { ShopCard } from "~/routes/account_partner/components/shop-card";
import { TermsPlate } from "~/routes/account_partner/components/terms-plate";
import type { PartnerFunnel } from "~/routes/account_partner/funnel";

/*===== Route =====*/
// The account layout lets customers in too, but the partner's pages are his alone (docs/app-spec.md, Pages).
export const Route = createFileRoute("/account/partner")({
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  /**
   * The partner's shop card, funnel and commissions. A partner user with no `partner` row is a broken account: the API
   * answers NOT_FOUND, and that becomes the 404 look that explains it, not an empty page.
   */
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      orNotFound(queryClient.ensureQueryData(orpc.partner.getMine.queryOptions())),
      queryClient.ensureQueryData(orpc.commission.listMine.queryOptions()),
      queryClient.ensureQueryData(orpc.partner.leads.list.queryOptions()),
    ]);
  },
  head: () =>
    pageHead({
      path: "/account/partner",
      title: m.account_partner_meta_title(),
      description: m.account_partner_meta_description(),
    }),
  component: AccountPartnerPage,
  // Inside the account shell, so the header stays on screen.
  notFoundComponent: () => <PartnerError notFound />,
  errorComponent: () => <PartnerError notFound={false} />,
});

/*===== Funnel and Commissions =====*/
/** The funnel's three numbers, and the commissions newest first with what is owed and what was paid. */
function summarize({
  leads,
  commissions,
}: {
  leads: readonly PartnerPerson[];
  commissions: readonly PartnerCommission[];
}) {
  /*------ Funnel ------*/
  // Lost people are not this partner's to count. «ثبت‌نام‌شده» includes those who went on to buy, as the road shows.
  const funnel: PartnerFunnel = {
    numbers: leads.filter((person) => person.stage !== "lost").length,
    registered: leads.filter((person) => person.stage === "registered" || person.stage === "bought").length,
    bought: leads.filter((person) => person.stage === "bought").length,
  };

  /*------ Commissions ------*/
  // Newest first, so a fresh commission is the first thing a partner reads.
  // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array from the spread.
  const sorted = [...commissions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const unpaidAmount = sorted.filter((c) => c.paidAt === null).reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = sorted.filter((c) => c.paidAt !== null).reduce((sum, c) => sum + c.amount, 0);

  return { funnel, commissions: sorted, unpaidAmount, paidAmount };
}

/*===== Partner Dashboard =====*/
/**
 * F7's partner home, «همکاری من»: the center's dog visits the partner's shop. The hero greets him with the funnel's
 * tally, the notices say what stands between him and his commission, and the grid holds his shop card (the QR on the
 * counter, the link, the PNG; sticky at the start on desktop) beside the people his link brought and what he is owed.
 * Shows amounts and customers' names only (F12): nothing about prices, dogs or other partners, because the API sends
 * nothing more.
 */
function AccountPartnerPage() {
  const { firstName, role } = Route.useRouteContext({ select: (context) => context.user });
  // A customer refers friends from this same page (F7, the owner 2026-11-07).
  const isPartner = role === "partner";
  const { data: profile } = useSuspenseQuery(orpc.partner.getMine.queryOptions());
  const { data: allCommissions } = useSuspenseQuery(orpc.commission.listMine.queryOptions());
  const { data: leads } = useSuspenseQuery(orpc.partner.leads.list.queryOptions());
  const { isActive, shebaNumber, commissionTiers, payingCustomers, terms } = profile;
  // The referral link lands on the home page; the QR is the same link as a code the customer's phone can scan.
  const { link, qr } = profile;
  const { funnel, commissions, unpaidAmount, paidAmount } = summarize({ leads, commissions: allCommissions });

  return (
    <>
      <PageMotion />

      {/*===== Hero =====*/}
      <PartnerHero firstName={firstName} funnel={funnel} isPartner={isPartner} />

      <div className={COLUMN}>
        {/*===== Terms First =====*/}
        {/* Until he accepts the terms in force, they are the whole page: no link or QR to hand out, and the server
            refuses new customers. */}
        {!terms.accepted ? (
          <TermsPlate />
        ) : (
          <>
            {/*===== Notices =====*/}
            <PartnerNotices isActive={isActive} hasSheba={shebaNumber !== null} />

            {/*===== Two Columns From lg =====*/}
            {/* The shop card comes first in the document, so the phone reads it before the funnel and commissions. It is
            sticky only where the screen is tall enough to show all of it. */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-y-12 lg:grid-cols-12 lg:items-start lg:gap-x-8">
              <div className="lg:col-span-5 lg:[@media(min-height:52rem)]:sticky lg:[@media(min-height:52rem)]:top-6">
                <ShopCard link={link} qr={qr} isPartner={isPartner} />
              </div>

              <div className="flex flex-col gap-12 lg:col-span-7">
                <FunnelPlate funnel={funnel} />
                <CommissionPlate
                  commissions={commissions}
                  unpaidAmount={unpaidAmount}
                  paidAmount={paidAmount}
                  commissionTiers={commissionTiers}
                  payingCustomers={payingCustomers}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
