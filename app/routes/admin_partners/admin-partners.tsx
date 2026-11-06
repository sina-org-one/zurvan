import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { CheckCheckIcon, HandshakeIcon, InboxIcon, PlusIcon, WalletIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdminEmptyState } from "~/components/admin-empty-state";
import { AdminFilterPills, type AdminFilterOption } from "~/components/admin-filter-pills";
import { AdminPageHeader } from "~/components/admin-page-header";
import { Link } from "~/components/link";
import { Button, buttonVariants } from "~/components/ui/button";
import { ADMIN_HAIRLINE, ADMIN_PLATE } from "~/lib/admin-plate";
import { formatToman } from "~/lib/course-format";
import { formatNumberFa } from "~/lib/digits";
import type { AdminCommission } from "~/orpc/commission/contract";
import { orpc } from "~/orpc/client";
import { ApplicationsList } from "~/routes/admin_partners/components/applications-list";
import { CreateSheet } from "~/routes/admin_partners/components/create-sheet";
import { DeactivateDialog } from "~/routes/admin_partners/components/deactivate-dialog";
import { LEAVE_MS, PageMotion } from "~/routes/admin_partners/components/page-motion";
import { PaidLedger } from "~/routes/admin_partners/components/paid-ledger";
import { PartnerDrawer } from "~/routes/admin_partners/components/partner-drawer";
import { PartnerRow, ROSTER_BOX, ROSTER_COLUMNS } from "~/routes/admin_partners/components/partner-row";
import { PayDialog } from "~/routes/admin_partners/components/pay-dialog";
import { PaySlip } from "~/routes/admin_partners/components/pay-slip";
import { countsAsUnpaid, type LeavingLine, withLeavingLines } from "~/routes/admin_partners/leaving";
import { groupUnpaid, listPaid } from "~/routes/admin_partners/partner-views";
import {
  adminPartnersSearchSchema,
  DEFAULT_PARTNER_VIEW,
  type PartnerView,
} from "~/routes/admin_partners/search-params";

/*===== Constants =====*/
const VIEW_LABELS: Record<PartnerView, string> = {
  unpaid: "پرداخت‌نشده",
  paid: "پرداخت‌شده",
  partners: "همکاران",
  applications: "درخواست‌ها",
};

/** The stagger between slips or rows as a view arrives; after the sixth they come together. */
const RISE_STEP_S = 0.06;
const MAX_STAGGERED = 5;

/*===== Queries =====*/
const partnersQuery = () => orpc.partner.admin.list.queryOptions();
const commissionsQuery = () => orpc.commission.admin.list.queryOptions({ input: {} });
const applicationsQuery = () => orpc.partnerApplication.admin.list.queryOptions();
// The site's origin, only for showing the referral link as it will be printed.
const siteQuery = () => orpc.site.config.queryOptions();

/*===== Route =====*/
// The guard is the layout's. Both lists come whole, once: the view, the counts and the open drawer are URL state applied
// in the component, so none is a loader dep and none of them waits for the server.
export const Route = createFileRoute("/admin/partners")({
  validateSearch: adminPartnersSearchSchema,
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(partnersQuery()),
      queryClient.ensureQueryData(commissionsQuery()),
      queryClient.ensureQueryData(applicationsQuery()),
      queryClient.ensureQueryData(siteQuery()),
    ]),
  head: () => ({ meta: [{ title: "همکاران | مدیریت زروان" }] }),
  component: AdminPartnersPage,
  notFoundComponent: () => <PartnersError notFound />,
  errorComponent: () => <PartnersError notFound={false} />,
});

/*===== Admin Partners =====*/
/**
 * F7 and F9 for the Admin: where he pays the partners what they earned and opens or closes a partner's account. The
 * first view is the pay sheet (a slip per partner who is owed: the Sheba to copy, the sum, and a «پرداخت شد» per
 * commission); the others are the ledger of what he paid and the roster. The money itself moves in his bank app: the
 * page only records it.
 *
 * A line he pays doesn't just vanish when the list reloads: the page keeps its unpaid copy for under a second
 * (`leaving`), so it can be stamped and fold away (and its slip with it, if it was the last), while the sum and the
 * pill's count change as the stamp lands.
 */
function AdminPartnersPage() {
  const { data: partners, isFetching: partnersFetching } = useSuspenseQuery(partnersQuery());
  const { data: commissions, isFetching: commissionsFetching } = useSuspenseQuery(commissionsQuery());
  const { data: applications } = useSuspenseQuery(applicationsQuery());
  const pendingApplications = applications.filter((application) => application.status === "pending").length;
  const {
    data: { origin: siteOrigin },
  } = useSuspenseQuery(siteQuery());

  /*------ URL State ------*/
  const search = Route.useSearch();
  const view = search.view ?? DEFAULT_PARTNER_VIEW;
  const openId = search.partner ?? null;
  const creating = search.new !== undefined;
  const navigate = useNavigate({ from: Route.fullPath });

  /*------ Dialogs ------*/
  // One pay dialog for every «پرداخت شد» (slips and drawer). The target outlives the dialog's closing so its words
  // don't blank mid-fade, and `session` remounts it for each opening so an old failure doesn't come back.
  const [payTarget, setPayTarget] = useState<{ commission: AdminCommission; session: number } | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [deactivateSession, setDeactivateSession] = useState(0);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  /*------ Busy ------*/
  // Only a reload of the lists dims them (the refetch after a write); leaving for another Admin page shouldn't flash it.
  const busy = partnersFetching || commissionsFetching;

  /*------ Leaving Lines ------*/
  const [leaving, setLeaving] = useState<LeavingLine[]>([]);
  const batchRef = useRef(0);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());

  // A removal timer must not fire into an unmounted page.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  /*------ List Arrival ------*/
  // `arrival` counts the view changes he makes, so the new list rises in (never on load); `settled` counts the exits
  // that finished, so the empty pay sheet left by his last payment rises in too instead of snapping into place.
  const [arrival, setArrival] = useState(0);
  const [settled, setSettled] = useState(0);

  /*------ Derived Lists ------*/
  const waiting = useMemo(
    () => new Set(leaving.filter((line) => line.batch === undefined).map((line) => line.commission.id)),
    [leaving],
  );
  const motion = useMemo(
    () => ({
      leaving: new Set(leaving.map((line) => line.commission.id)),
      playing: new Set(leaving.filter((line) => line.batch !== undefined).map((line) => line.commission.id)),
    }),
    [leaving],
  );

  const unpaidBlocks = useMemo(
    () => groupUnpaid({ commissions: withLeavingLines({ commissions, leaving }), partners }),
    [commissions, leaving, partners],
  );
  const paidCommissions = useMemo(
    () => listPaid(commissions).filter((commission) => !waiting.has(commission.id)),
    [commissions, waiting],
  );
  const counted = commissions.filter((commission) => countsAsUnpaid({ commission, waiting }));
  const unpaidCount = counted.length;
  const unpaidTotal = counted.reduce((sum, commission) => sum + commission.amount, 0);

  // What he has already paid each partner, for the slip's foot; a line still waiting for its stamp isn't in it yet.
  const paidByPartner = useMemo(() => {
    const totals = new Map<string, { count: number; amount: number }>();
    for (const commission of paidCommissions) {
      const entry = totals.get(commission.partner.id) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += commission.amount;
      totals.set(commission.partner.id, entry);
    }
    return totals;
  }, [paidCommissions]);

  const options: AdminFilterOption<PartnerView>[] = [
    { value: "unpaid", label: VIEW_LABELS.unpaid, count: unpaidCount },
    { value: "paid", label: VIEW_LABELS.paid, count: paidCommissions.length },
    { value: "partners", label: VIEW_LABELS.partners, count: partners.length },
    { value: "applications", label: VIEW_LABELS.applications, count: pendingApplications },
  ];

  // The drawer looks in the full list, so a write that changes the partner doesn't close it.
  const opened = openId === null ? null : (partners.find((item) => item.id === openId) ?? null);
  const openedCommissions = useMemo(
    () =>
      commissions
        .filter((commission) => commission.partner.id === openId)
        // oxlint-disable-next-line unicorn/no-array-sort -- `filter` made our own copy
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [commissions, openId],
  );

  const listRef = useRef<HTMLDivElement>(null);
  const drawerBodyRef = useRef<HTMLDivElement>(null);

  /*------ Handlers ------*/
  const searchFor = (partnerId: string) => ({ view: search.view, partner: partnerId });

  /** A new view: drops every kept line (a new view never shows another view's exit) and lets the list rise in. */
  function changeView(next: PartnerView) {
    if (next === view) return;
    setLeaving([]);
    setArrival((previous) => previous + 1);
    // Replace, not push: a view isn't a place to go Back to.
    void navigate({
      search: (prev) => ({ ...prev, view: next === DEFAULT_PARTNER_VIEW ? undefined : next }),
      replace: true,
      resetScroll: false,
    });
  }

  function askToPay(commission: AdminCommission) {
    setPayTarget((previous) => ({ commission, session: (previous?.session ?? 0) + 1 }));
    setPayOpen(true);
  }

  /** The API accepted a payment made on the pay sheet: keep the line, in its place, until its exit has played. */
  function keepLeavingLine(commission: AdminCommission) {
    // From the drawer the line stays in his file (its chip is pressed in there); the sheet behind it just updates.
    if (view !== "unpaid" || openId !== null) return;
    // Under reduced motion there is no exit to play: the reload simply takes the line away.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setLeaving((previous) => [...previous.filter((line) => line.commission.id !== commission.id), { commission }]);
  }

  /** The dialog closed: the lines it paid start their exit now (not under its backdrop), and leave when it's done. */
  function closePayDialog() {
    setPayOpen(false);

    const batch = ++batchRef.current;
    let started = false;
    setLeaving((previous) => {
      if (!previous.some((line) => line.batch === undefined)) return previous;
      started = true;
      return previous.map((line) => (line.batch === undefined ? { ...line, batch } : line));
    });
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      setLeaving((previous) => previous.filter((line) => line.batch !== batch));
      if (started) setSettled((previous) => previous + 1);
    }, LEAVE_MS);
    timersRef.current.add(timer);
  }

  /*------ Rendering Helpers ------*/
  const rise = (index: number) => (arrival > 0 ? Math.min(index, MAX_STAGGERED) * RISE_STEP_S : null);

  return (
    <div>
      <PageMotion />

      {/*===== Header =====*/}
      <AdminPageHeader
        title="همکاران"
        summary={
          unpaidCount > 0
            ? `${formatNumberFa(unpaidCount)} هدیه‌ی معرفی منتظر پرداخته · جمعش ${formatToman(unpaidTotal)}`
            : "هدیه‌ای منتظر نیست"
        }
      >
        {/* Outline, not gold: on this page gold stays for the money waiting. */}
        <Button
          type="button"
          variant="outline"
          className="h-11 border-foreground/20 bg-transparent ps-3.5 md:h-10 dark:bg-transparent"
          onClick={() => void navigate({ search: (prev) => ({ ...prev, new: 1 }), resetScroll: false })}
        >
          <PlusIcon aria-hidden strokeWidth={1.7} />
          همکار تازه
        </Button>
      </AdminPageHeader>

      {partners.length === 0 && applications.length === 0 ? (
        /*===== Nothing at All =====*/
        <AdminEmptyState title="هنوز همکاری نیست" icon={HandshakeIcon}>
          کلینیک، آرایشگاه یا پت‌شاپی که باهاش قرار گذاشتی رو با «همکار تازه» بساز؛ لینک و QR خودش رو می‌گیره.
          درخواست‌هایی که از صفحه‌ی همکاری میان هم این‌جا میان.
        </AdminEmptyState>
      ) : (
        <>
          {/*===== Views =====*/}
          {/* A count that changes under him pops inside the pills themselves. */}
          <div className="mb-5">
            <AdminFilterPills label="نمایش" options={options} value={view} onChange={changeView} />
          </div>

          {/* Focusable so focus has somewhere to land when the line he just paid leaves. */}
          <div
            ref={listRef}
            tabIndex={-1}
            aria-busy={busy}
            aria-label={VIEW_LABELS[view]}
            className={cn("scroll-mt-24 rounded-3xl transition-opacity outline-none", busy && "opacity-60")}
          >
            {/*===== Pay Sheet =====*/}
            {view === "unpaid" &&
              (unpaidBlocks.length === 0 ? (
                <div key={`${arrival}-${settled}`} className={cn((arrival > 0 || settled > 0) && "answer-in")}>
                  <AdminEmptyState title="هدیه‌ای منتظر نیست" icon={CheckCheckIcon}>
                    هر بار مشتریِ یکی از همکارها خرید کنه، هدیه‌ش این‌جا میاد تا پرداختش کنی.
                  </AdminEmptyState>
                </div>
              ) : (
                <ul key={arrival} aria-label="همکارهایی که هدیه‌ی معرفی طلب دارن" className="-mb-4 flex flex-col">
                  {unpaidBlocks.map((block, index) => (
                    <PaySlip
                      key={block.partnerId}
                      block={block}
                      search={searchFor(block.partnerId)}
                      paidBefore={paidByPartner.get(block.partnerId) ?? { count: 0, amount: 0 }}
                      motion={motion}
                      rise={rise(index)}
                      onPay={askToPay}
                    />
                  ))}
                </ul>
              ))}

            {/*===== Paid Ledger =====*/}
            {view === "paid" &&
              (paidCommissions.length === 0 ? (
                <div key={arrival} className={cn(arrival > 0 && "answer-in")}>
                  <AdminEmptyState title="هنوز هدیه‌ای پرداخت نشده" icon={WalletIcon}>
                    هر هدیه‌ای که «پرداخت شد» بزنی، با روزش این‌جا می‌مونه.
                  </AdminEmptyState>
                </div>
              ) : (
                <PaidLedger key={arrival} commissions={paidCommissions} searchFor={searchFor} rise={rise} />
              ))}

            {/*===== Applications =====*/}
            {view === "applications" &&
              (applications.length === 0 ? (
                <div key={arrival} className={cn(arrival > 0 && "answer-in")}>
                  <AdminEmptyState title="درخواستی نیست" icon={InboxIcon}>
                    هر کی از صفحه‌ی «همکاری با زروان» درخواست بده، این‌جا میاد تا تأییدش کنی یا ردش کنی.
                  </AdminEmptyState>
                </div>
              ) : (
                <ApplicationsList
                  key={arrival}
                  applications={applications}
                  onOpenPartner={(partnerId) =>
                    void navigate({ search: (prev) => ({ ...prev, partner: partnerId }), resetScroll: false })
                  }
                />
              ))}

            {/*===== Roster =====*/}
            {view === "partners" && (
              <div className={cn(ADMIN_PLATE, "overflow-hidden")}>
                {/*------ Column Head ------*/}
                {/* Only where the row is one line in fixed tracks; the rows say the same to a screen reader. */}
                <div aria-hidden className={cn("hidden border-b py-1 xl:block", ADMIN_HAIRLINE)}>
                  <div className={cn(ROSTER_BOX, "grid py-1.5 text-xs text-muted-foreground", ROSTER_COLUMNS)}>
                    <span />
                    <span>همکار</span>
                    <span>کد لینک</span>
                    <span>شماره</span>
                    <span>آدم‌هاش</span>
                    <span className="text-end">طلبش</span>
                  </div>
                </div>

                {/*------ Rows ------*/}
                <ul key={arrival} aria-label="فهرست همکاران" className={cn("divide-y", ADMIN_HAIRLINE)}>
                  {partners.map((partner, index) => (
                    <PartnerRow key={partner.id} partner={partner} search={searchFor(partner.id)} rise={rise(index)} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      {/*===== Partner Drawer =====*/}
      <PartnerDrawer
        partnerId={openId}
        partner={opened}
        commissions={openedCommissions}
        siteOrigin={siteOrigin}
        bodyRef={drawerBodyRef}
        // Closing replaces the entry: the open state was pushed so Back closes it, but a close button must not leave a
        // forward entry that reopens it.
        onClose={() =>
          void navigate({ search: (prev) => ({ ...prev, partner: undefined }), replace: true, resetScroll: false })
        }
        onPay={askToPay}
        onDeactivate={() => {
          setDeactivateSession((session) => session + 1);
          setDeactivateOpen(true);
        }}
      />

      {/*===== Create Sheet =====*/}
      <CreateSheet
        open={creating}
        siteOrigin={siteOrigin}
        onClose={() =>
          void navigate({ search: (prev) => ({ ...prev, new: undefined }), replace: true, resetScroll: false })
        }
        onCreated={(partner) => {
          if (view !== "partners") {
            setLeaving([]);
            setArrival((previous) => previous + 1);
          }
          void navigate({
            search: (prev) => ({ ...prev, view: "partners", partner: partner.id, new: undefined }),
            resetScroll: false,
          });
        }}
      />

      {/*===== Confirms =====*/}
      {payTarget && (
        <PayDialog
          key={payTarget.session}
          open={payOpen}
          onOpenChange={(open) => (open ? setPayOpen(true) : closePayDialog())}
          commission={payTarget.commission}
          onConfirmed={keepLeavingLine}
          returnFocus={() => (openId !== null ? drawerBodyRef.current : listRef.current)}
        />
      )}
      {opened && (
        <DeactivateDialog
          key={`${opened.id}-${deactivateSession}`}
          open={deactivateOpen}
          onOpenChange={setDeactivateOpen}
          partner={opened}
          returnFocus={() => drawerBodyRef.current}
        />
      )}
    </div>
  );
}

/*===== Error Boundary =====*/
// Renders inside the Admin layout, so the rail and tabs stay.
function PartnersError({ notFound }: { notFound: boolean }) {
  return (
    <div>
      <AdminPageHeader
        title={notFound ? "این صفحه پیدا نشد" : "همکاران باز نشد"}
        summary="یه مشکلی پیش اومد. صفحه رو دوباره باز کن یا چند دقیقه‌ی دیگه سر بزن."
      />
      <Link to="/admin" className={buttonVariants({ variant: "outline", size: "default" })}>
        برگرد به نمای کلی
      </Link>
    </div>
  );
}
