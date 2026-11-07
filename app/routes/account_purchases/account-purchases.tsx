import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "~/lib/seo";
import { requireSession } from "~/lib/session-guard";
import type { Payment } from "~/orpc/checkout/contract";
import { orpc } from "~/orpc/client";
import type { Dog } from "~/orpc/dog/contract";
import type { Media } from "~/orpc/media/contract";
import { m } from "~/paraglide/messages";

import { COLUMN } from "./column";
import { NextCourseBand } from "./components/next-course-band";
import { NoPurchases } from "./components/no-purchases";
import { PageMotion } from "./components/page-motion";
import { PurchasesError } from "./components/purchases-error";
import { PurchasesHero } from "./components/purchases-hero";
import { SlipsSection } from "./components/slips-section";

/*===== Route =====*/
// The account layout lets partners in too, but payments are a customer's (docs/app-spec.md, F5).
export const Route = createFileRoute("/account/purchases")({
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  loader: async ({ context: { queryClient } }) => {
    // The dogs are read only for their photos: a payment item carries just the dog's id and name.
    await Promise.all([
      queryClient.ensureQueryData(orpc.checkout.payments.queryOptions()),
      queryClient.ensureQueryData(orpc.refund.listMine.queryOptions()),
      queryClient.ensureQueryData(orpc.dog.list.queryOptions()),
    ]);
  },
  head: () =>
    pageHead({
      path: "/account/purchases",
      title: m.account_purchases_meta_title(),
      description: m.account_purchases_meta_description(),
    }),
  // The page ends on its brick band, which runs straight into the footer: the account shell drops `main`'s bottom
  // padding for it.
  staticData: { flushFooter: true },
  component: AccountPurchasesPage,
  notFoundComponent: () => <PurchasesError notFound />,
  errorComponent: () => <PurchasesError notFound={false} />,
});

/*===== Slips =====*/
/** The payments newest first, each dog's photo by its id, and the hero's three numbers. */
function buildPurchases({ payments, dogs }: { payments: readonly Payment[]; dogs: readonly Dog[] }) {
  /*------ Order ------*/
  // The API already returns newest first; sorting again keeps the page right if that ever changes.
  // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array from the spread.
  const sorted = [...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  /*------ Photos ------*/
  const photos: Record<string, Media | null> = Object.fromEntries(dogs.map((dog) => [dog.id, dog.photo]));

  /*------ Tally ------*/
  // The hero's three numbers, from the paid payments only: a failed or pending one bought nothing.
  const paidItems = sorted.filter((payment) => payment.status === "paid").flatMap((payment) => payment.items);
  const tally = {
    payments: sorted.filter((payment) => payment.status === "paid").length,
    courses: paidItems.length,
    training: paidItems.filter((item) => item.enrollment?.status === "active").length,
  };

  return { payments: sorted, photos, tally };
}

/*===== Purchases =====*/
/**
 * F5's record of what was paid, «خریدها»: the center's dog keeps the receipts in his book. The hero with the tally, then
 * one paper slip per payment (the dog and course on each line, what each turned into, what was given back), and the
 * closing brick band towards the next course. The app only records; there is nothing to pay or edit here.
 */
function AccountPurchasesPage() {
  const { data: allPayments } = useSuspenseQuery(orpc.checkout.payments.queryOptions());
  const { data: refunds } = useSuspenseQuery(orpc.refund.listMine.queryOptions());
  const { data: dogs } = useSuspenseQuery(orpc.dog.list.queryOptions());
  const { payments, photos, tally } = buildPurchases({ payments: allPayments, dogs });

  return (
    <>
      <PageMotion />

      {/*===== Hero =====*/}
      <PurchasesHero tally={tally} />

      {/*===== Slips =====*/}
      <div className={COLUMN}>
        {payments.length === 0 ? (
          <NoPurchases />
        ) : (
          <SlipsSection payments={payments} refunds={refunds} photos={photos} />
        )}
      </div>

      {/*===== Next Course =====*/}
      <NextCourseBand />
    </>
  );
}
