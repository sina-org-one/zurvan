import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { useMemo, useRef, useState } from "react";

import { pageHead } from "~/lib/seo";
import { orNotFound } from "~/lib/not-found";
import { requireSession } from "~/lib/session-guard";
import { orpc } from "~/orpc/client";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/account_partner_leads/column";
import { AddLeadForm } from "~/routes/account_partner_leads/components/add-lead-form";
import { HowItCounts } from "~/routes/account_partner_leads/components/how-it-counts";
import { LeadsError } from "~/routes/account_partner_leads/components/leads-error";
import { LeadsHero } from "~/routes/account_partner_leads/components/leads-hero";
import { LeadsList } from "~/routes/account_partner_leads/components/leads-list";
import { PageMotion } from "~/routes/account_partner_leads/components/page-motion";
import { PAGE_SIZE, partnerLeadsSearchSchema } from "~/routes/account_partner_leads/search-params";
import { countPeople, filterPeople } from "~/routes/account_partner_leads/stages";

/*===== Route =====*/
// The account layout lets customers in too; the partner's pages are his alone (docs/app-spec.md, Pages).
export const Route = createFileRoute("/account/partner/leads")({
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  validateSearch: partnerLeadsSearchSchema,
  // The whole list comes once: the stage pills, their counts and the paging are applied in the component, so changing
  // them never waits for the server. `getMine` is only for `isActive`; a partner user with no `partner` row is a broken
  // account, not an empty page.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(orpc.partner.leads.list.queryOptions()),
      orNotFound(queryClient.ensureQueryData(orpc.partner.getMine.queryOptions())),
    ]);
  },
  head: () =>
    pageHead({
      path: "/account/partner/leads",
      title: m.account_partner_leads_meta_title(),
      description: m.account_partner_leads_meta_description(),
    }),
  component: AccountPartnerLeadsPage,
  // Inside the account shell, so the header and the partner's tabs stay on screen.
  notFoundComponent: () => <LeadsError notFound />,
  errorComponent: () => <LeadsError notFound={false} />,
});

/*===== Leads and Customers =====*/
/**
 * F7's second partner tab: the partner writes down the phone of someone about to sign up, then watches each person
 * move from number to sign-up to purchase on a small road. He sees names and dates only, never prices or dogs (F12).
 *
 * The idea is the road: the center's dog takes the call in the hero and the numbers down in his notebook on the form's
 * plate (the start column, sticky on desktop); the list's plate lines every person's road up in one column, so the gold
 * reads down the list. Phones: the hero, the form, the note, then the list.
 */
function AccountPartnerLeadsPage() {
  const queryClient = useQueryClient();
  const { data: people } = useSuspenseQuery(orpc.partner.leads.list.queryOptions());
  const {
    data: { isActive, terms },
  } = useSuspenseQuery(orpc.partner.getMine.queryOptions());

  /*------ URL State ------*/
  const search = Route.useSearch();
  const stage = search.stage ?? "all";
  const requestedPage = search.page ?? 1;
  const navigate = useNavigate({ from: Route.fullPath });

  /*------ Pending ------*/
  // While the list is read again after an add (not on every background refetch).
  const [pending, setPending] = useState(false);

  /*------ The Row That Was Just Added ------*/
  // Found by comparing the ids before and after the list is read again, not by trusting the add's answer: the list is
  // what the partner sees, and a row that is not there cannot be highlighted. Adjusting state while rendering (not in
  // an effect) keeps it to one render, with no frame where the new row is there but not marked.
  const [knownPeople, setKnownPeople] = useState(people);
  const [awaitingNew, setAwaitingNew] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<ReadonlySet<string>>(new Set());
  if (people !== knownPeople) {
    setKnownPeople(people);
    if (awaitingNew) {
      const before = new Set(knownPeople.map((person) => person.id));
      setHighlightedIds(new Set(people.filter((person) => !before.has(person.id)).map((person) => person.id)));
      setAwaitingNew(false);
    }
  }

  /*------ Derived Lists ------*/
  const counts = useMemo(() => countPeople({ people }), [people]);
  const matches = useMemo(() => filterPeople({ people, stage }), [people, stage]);

  // A page past the end (an old link) shows the last one.
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage, 1), pageCount);
  const visiblePeople = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const listRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PageMotion />

      {/*===== Hero =====*/}
      <LeadsHero tally={{ lead: counts.lead, registered: counts.registered, bought: counts.bought }} />

      <div
        className={cn(
          COLUMN,
          "grid grid-cols-[minmax(0,1fr)] gap-y-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-10 xl:gap-x-12",
        )}
      >
        {/*===== Add a Number =====*/}
        {/* Sticky on desktop, so the form stays at hand while a long list scrolls past. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <AddLeadForm
            isActive={isActive}
            termsAccepted={terms.accepted}
            onAdded={(person) => {
              // The new person shows first on page one; a filter or page that hides them is dropped so he sees it land.
              void navigate({
                search: (prev) => ({
                  stage: stage === "all" || stage === person.stage ? prev.stage : undefined,
                  page: undefined,
                }),
                replace: true,
                resetScroll: false,
              });
              setAwaitingNew(true);
              setPending(true);
              // The partner dashboard's funnel counts the same people, so the whole partner domain is read again.
              void queryClient.invalidateQueries({ queryKey: orpc.partner.key() }).finally(() => setPending(false));
            }}
          />

          {/*------ How It Counts ------*/}
          <HowItCounts />
        </div>

        {/*===== People =====*/}
        <LeadsList
          total={people.length}
          counts={counts}
          stage={stage}
          page={page}
          pageCount={pageCount}
          visiblePeople={visiblePeople}
          highlightedIds={highlightedIds}
          pending={pending}
          listRef={listRef}
          onStage={(next) =>
            void navigate({
              search: { stage: next === "all" ? undefined : next, page: undefined },
              replace: true,
              resetScroll: false,
            })
          }
          onPage={(next) => {
            // Paging is the one change the Back button should undo, so it pushes.
            void navigate({
              search: (prev) => ({ ...prev, page: next === 1 ? undefined : next }),
              resetScroll: false,
            });
            listRef.current?.scrollIntoView({ block: "start" });
          }}
        />
      </div>
    </>
  );
}
