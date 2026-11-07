import { cn } from "cn";

import { Link } from "~/components/link";
import { ADMIN_HAIRLINE, ADMIN_PLATE } from "~/lib/admin-plate";
import { formatToman } from "~/lib/course-format";
import { formatJalaliTimestamp } from "~/lib/jalali";
import type { AdminCommission } from "~/orpc/commission/contract";
import type { AdminPartnersSearch } from "~/routes/admin_partners/search-params";

/*===== Columns =====*/
// From `md` one row in fixed tracks, shared by the head and the rows: the day paid, the partner, the customer, the
// amount. The date and the amount have fixed widths so the eye runs straight down them.
const LEDGER_COLUMNS = "md:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_9rem] md:gap-x-5";
const LEDGER_PADDING = "px-4 sm:px-5 xl:px-6";

/*===== Paid Ledger =====*/
/**
 * Commissions already paid, newest payment first: a record to look back at ("did I pay Bahram for Sara?"), with
 * nothing to press. One plate of ruled rows with a muted column head from `md`; no paging, the list is short (a
 * partner earns once per customer). Phones: two lines, the partner and the amount, then the customer and the day.
 *
 * The partner's name opens his file. `rise` staggers the first rows in after a view change (null otherwise).
 */
export function PaidLedger({
  commissions,
  searchFor,
  rise,
}: {
  commissions: readonly AdminCommission[];
  /**
   * The page's search with a partner's file open (`?partner=`): a real link, so the name works for a new tab and before
   * hydration. A click opens the file in place (a search-only change that keeps the scroll).
   */
  searchFor: (partnerId: string) => AdminPartnersSearch;
  rise: (index: number) => number | null;
}) {
  return (
    <div className={cn(ADMIN_PLATE, "overflow-hidden")}>
      {/*------ Column Head ------*/}
      <div
        aria-hidden
        className={cn(
          "hidden border-b py-2.5 text-xs text-muted-foreground md:grid",
          LEDGER_COLUMNS,
          LEDGER_PADDING,
          ADMIN_HAIRLINE,
        )}
      >
        <span>پرداخت</span>
        <span>همکار</span>
        <span>مشتری</span>
        <span className="text-end">مبلغ</span>
      </div>

      {/*------ Rows ------*/}
      <ul aria-label="هدیه‌های معرفی پرداخت‌شده" className={cn("divide-y", ADMIN_HAIRLINE)}>
        {commissions.map((commission, index) => {
          const delay = rise(index);
          return (
            <li
              key={commission.id}
              style={delay !== null ? ({ "--answer-delay": `${delay}s` } as React.CSSProperties) : undefined}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-3",
                "[grid-template-areas:'partner_amount'_'customer_date'] md:[grid-template-areas:'date_partner_customer_amount']",
                LEDGER_COLUMNS,
                LEDGER_PADDING,
                delay !== null && "answer-in",
              )}
            >
              {/*------ Partner ------*/}
              <p className="min-w-0 [grid-area:partner]">
                <Link
                  to="/admin/partners"
                  search={searchFor(commission.partner.id)}
                  resetScroll={false}
                  className="inline-flex min-h-6 items-center rounded-sm text-sm font-bold break-words underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <bdi>{commission.partner.name}</bdi>
                </Link>
              </p>

              {/*------ Customer ------*/}
              <p className="min-w-0 truncate text-xs text-muted-foreground [grid-area:customer] md:text-sm md:text-foreground/85">
                <span className="sr-only">مشتری: </span>
                <bdi>{commission.customer.name}</bdi>
              </p>

              {/*------ Day Paid ------*/}
              <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums [grid-area:date] max-md:text-end md:text-sm">
                <span className="sr-only">پرداخت شد </span>
                {commission.paidAt && formatJalaliTimestamp(commission.paidAt)}
              </p>

              {/*------ Amount ------*/}
              <p className="text-end text-sm font-bold whitespace-nowrap tabular-nums [grid-area:amount]">
                {formatToman(commission.amount)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
