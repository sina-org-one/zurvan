import { cn } from "cn";

import { ChalkBubble } from "~/components/chalk-bubble";
import { CommissionStairs } from "~/components/commission-stairs";
import { MascotCut } from "~/components/mascot-cut";
import { commissionPercentFor, type CommissionTier } from "~/lib/business-rules";
import { formatToman } from "~/lib/course-format";
import { formatNumber, formatTimestamp } from "~/lib/locale-format";
import type { PartnerCommission } from "~/orpc/commission/contract";
import { m } from "~/paraglide/messages";
import { EdgeDog } from "~/routes/account_partner/components/edge-dog";
import { PlateHead } from "~/routes/account_partner/components/plate-head";
import { useInView } from "~/routes/account_partner/hooks/use-in-view";
import { tomanDigits } from "~/routes/account_partner/money";
import { PLATE } from "~/routes/account_partner/plate";

// The slips that arrive one after another; later ones come with the last.
const STAGGERED = 5;

/*===== Commission Plate =====*/
/**
 * «هدیه‌های معرفیت»: what the partner is owed and what was paid, in Toman, the rule, the commission steps with the one his
 * next customer lands on marked (and a sentence saying how many paying customers he has and what the next one earns),
 * and one slip per commission, newest first (the customer's name and day, the amount, paid or waiting). Zurvann pays by bank
 * transfer and texts the partner, which is why the rule says so: a partner shouldn't wonder when the money comes. Only
 * names and amounts (F12): no prices, dogs or courses, because the API sends nothing more.
 *
 * The `coins` dog lies on the plate's top edge counting his stack by the dimmed till, and speaks once the plate comes
 * into view. Motion (page-motion.tsx, started by `useInView`): he rises from behind the edge, the slips rise in one
 * after another.
 */
export function CommissionPlate({
  commissions,
  unpaidAmount,
  paidAmount,
  commissionTiers,
  payingCustomers,
}: {
  /** Newest first. */
  commissions: readonly PartnerCommission[];
  /** Rial, not yet paid. */
  unpaidAmount: number;
  /** Rial, already paid. */
  paidAmount: number;
  commissionTiers: readonly CommissionTier[];
  /** Distinct customers who have earned him a commission: the count the steps are read against. */
  payingCustomers: number;
}) {
  const { ref, seen } = useInView<HTMLElement>({ threshold: 0.2 });

  const figures = [
    { label: m.account_partner_commission_awaiting(), value: unpaidAmount },
    { label: m.account_partner_commission_paid_total(), value: paidAmount },
  ];

  return (
    <section ref={ref} aria-labelledby="partner-commission-title">
      <PlateHead
        id="partner-commission-title"
        title={m.account_partner_commission_title()}
        figureClassName="ml-[3.75rem] sm:ml-[5.5rem]"
        figure={
          <EdgeDog
            name="coins"
            className="w-[7rem] sm:w-[9rem]"
            scenery={{ name: "register", width: "58%", className: "right-[76%]" }}
          >
            {seen && (
              <ChalkBubble
                tail="end"
                className="pd-say absolute bottom-[96%] max-w-none whitespace-nowrap ltr:right-[calc(24%-2.25rem)] rtl:left-[calc(76%-2.25rem)]"
              >
                {m.account_partner_commission_bubble()}
              </ChalkBubble>
            )}
          </EdgeDog>
        }
      />

      <div className={PLATE}>
        {/*===== Figures =====*/}
        <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-foreground/10 bg-card paper-grain">
          {figures.map(({ label, value }) => (
            <div
              key={label}
              className="min-w-0 border-s border-foreground/10 px-3.5 py-4 first:border-s-0 sm:px-6 sm:py-5"
            >
              <dt className="text-sm font-bold text-muted-foreground">{label}</dt>
              <dd className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
                {value === 0 ? (
                  <>
                    <span
                      aria-hidden
                      className="font-display text-[1.75rem] leading-none font-black text-muted-foreground/50"
                    >
                      —
                    </span>
                    <span className="sr-only">{m.account_partner_zero_toman_sr()}</span>
                  </>
                ) : (
                  <>
                    {/* A hundred million and up steps down a size, so the amount never wraps or spills on a phone. */}
                    <span
                      className={cn(
                        "font-display leading-none font-black whitespace-nowrap text-primary",
                        tomanDigits(value).length > 10
                          ? "text-[1.3rem] sm:text-[1.9rem]"
                          : "text-[1.6rem] sm:text-[2.25rem]",
                      )}
                    >
                      {tomanDigits(value)}
                    </span>
                    <span className="text-sm font-bold text-muted-foreground">{m.account_partner_toman_unit()}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {/*===== The Rule =====*/}
        <p className="mt-5 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
          {m.account_partner_commission_rule()}
        </p>

        {/*===== The Steps =====*/}
        <div className="mt-5 rounded-3xl border border-foreground/10 bg-card paper-grain px-4 pt-5 pb-3 sm:px-6">
          <CommissionStairs tiers={commissionTiers} reached={payingCustomers} />
        </div>
        <p className="mt-3 text-sm text-pretty sm:text-base">
          <Progress tiers={commissionTiers} payingCustomers={payingCustomers} />
        </p>

        {/*===== Slips =====*/}
        <div className="mt-6">
          {commissions.length === 0 ? <NoCommissions /> : <CommissionSlips commissions={commissions} />}
        </div>
      </div>
    </section>
  );
}

/*===== Progress =====*/
/** How many paying customers he has, and the percent the next one is written with. */
function Progress({ tiers, payingCustomers }: { tiers: readonly CommissionTier[]; payingCustomers: number }) {
  const next = payingCustomers + 1;
  const percent = m.shared_commission_percent({
    value: formatNumber(commissionPercentFor({ tiers, customerCount: next })),
  });

  return payingCustomers === 0
    ? m.account_partner_commission_progress_none({ percent })
    : m.account_partner_commission_progress({
        count: formatNumber(payingCustomers),
        next: formatNumber(next),
        percent,
      });
}

/*===== Commission Slips =====*/
/**
 * The commissions on one grained paper slip, dashed rules between them. Each: the customer's name with the day under
 * it at the start, the amount and its state at the end (a gold-outlined «پرداخت شد · day» or a muted «منتظر پرداخت»).
 * A long name wraps on its own; the amount never wraps.
 */
function CommissionSlips({ commissions }: { commissions: readonly PartnerCommission[] }) {
  return (
    <ul
      aria-label={m.account_partner_commission_list_label()}
      className="overflow-hidden rounded-3xl border border-foreground/10 bg-card paper-grain shadow-[0_18px_30px_-22px_rgb(0_0_0/0.95)]"
    >
      {commissions.map((commission, index) => {
        const { paidAt } = commission;
        const style = { "--pd-delay": `${0.35 + Math.min(index, STAGGERED) * 0.1}s` } as React.CSSProperties;

        return (
          <li
            key={commission.id}
            style={style}
            className="pd-slip flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-dashed border-foreground/15 px-4 py-4 first:border-t-0 sm:px-6"
          >
            {/*------ Who and When ------*/}
            <div className="min-w-0">
              <p className="font-bold break-words">{commission.customerName}</p>
              <time dateTime={commission.createdAt.toISOString()} className="text-sm text-muted-foreground">
                {formatTimestamp(commission.createdAt)}
              </time>
            </div>

            {/*------ Amount and State ------*/}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-col sm:items-end">
              <span className="font-bold whitespace-nowrap tabular-nums">{formatToman(commission.amount)}</span>
              {paidAt ? (
                <span className="rounded-full border border-primary/60 px-3 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                  {m.account_partner_commission_paid_on({ date: formatTimestamp(paidAt) })}
                </span>
              ) : (
                <span className="rounded-full bg-muted px-3 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
                  {m.account_partner_commission_awaiting()}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/*===== No Commissions =====*/
/**
 * Nothing owed yet: a dashed slip with the sentence at the start and the `piggy` dog lying small on its floor at the
 * end, a paw on his piggy bank. Physical sides for him: he faces right, towards the words.
 */
function NoCommissions() {
  return (
    <div className="pd-slip relative flex min-h-[7.5rem] items-center overflow-hidden rounded-3xl border-2 border-dashed border-foreground/15 p-5 pe-[8.5rem] [--pd-delay:.35s] sm:pe-[10rem] ltr:ps-[8.5rem] ltr:pe-5 ltr:sm:ps-[10rem] ltr:sm:pe-5">
      <p className="text-pretty text-muted-foreground">{m.account_partner_commission_none()}</p>
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[1.75rem] w-[6.25rem] translate-y-[3%] sm:left-[2.5rem] sm:w-[7rem]"
      >
        <div className="absolute -inset-x-1/2 -top-1/3 bottom-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_70%,rgb(255_194_26/0.08),transparent)]" />
        <MascotCut name="plants" className="lively-sway-2 absolute right-[88%] bottom-0 w-[24%] -scale-x-100" />
        <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[86%] w-[28%]" />
        <MascotCut name="piggy" className="lively-breathe relative block w-full" />
      </div>
    </div>
  );
}
