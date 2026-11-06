import { cn } from "cn";
import { useId } from "react";

import { CustomerContact } from "~/components/customer-contact";
import { Link } from "~/components/link";
import { ADMIN_HAIRLINE, ADMIN_PLATE } from "~/lib/admin-plate";
import { formatToman } from "~/lib/course-format";
import { formatNumberFa } from "~/lib/digits";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import type { AdminCommission } from "~/orpc/commission/contract";
import { CommissionLine, LINE_COLUMNS } from "~/routes/admin_partners/components/commission-line";
import { PopNumber } from "~/routes/admin_partners/components/pop-number";
import { ShebaInset } from "~/routes/admin_partners/components/sheba-inset";
import { tomanDigits } from "~/routes/admin_partners/money";
import type { UnpaidBlockData } from "~/routes/admin_partners/partner-views";
import { NOTCH } from "~/routes/admin_partners/slip-marks";
import type { AdminPartnersSearch } from "~/routes/admin_partners/search-params";

/*===== Types =====*/
/** Where each paid line of the pay sheet stands in its exit, by commission id. */
export type SlipMotion = {
  /** Kept for their exit; inert at once. */
  leaving: ReadonlySet<string>;
  /** Their exit has started (the dialog has closed). */
  playing: ReadonlySet<string>;
};

/*===== Pay Slip =====*/
/**
 * One partner who is owed, as a pay slip laid out in the order of his hands: copy the Sheba, send the sum in the bank
 * app, then tick each line.
 *
 * - **Stub** (from `xl` the start column, 18rem; below that the slip's head, the tear running under it): the partner's
 *   name in Estedad (it opens his file), his number as the call pill, the Sheba with «کپی شبا», then «جمع پرداخت» in
 *   Estedad. Ivory: money is not gold here. From `md` to `xl` the head is two columns, who and how much at the start,
 *   the Sheba at the end.
 * - **Lines:** one per commission, each with its own «پرداخت شد». There is no "pay all": each press writes one payment
 *   and sends one SMS. From `xl` a muted column head names the tracks.
 * - **Foot:** what he has already paid this partner, under the double rule, pushed to the bottom so a stub taller than
 *   the lines leaves no hole under them.
 *
 * A partner with no Sheba yet gets a dashed inset that says so, with the call pill in it (the pill isn't repeated under
 * the name); the lines' buttons stay, since he may pay another way.
 *
 * When every line of the slip is leaving, the whole slip folds (its lines only stamp). `rise` is the slip's delay in a
 * list that just arrived under a new view (`null` when it didn't).
 */
export function PaySlip({
  block,
  search,
  paidBefore,
  motion,
  rise,
  onPay,
}: {
  block: UnpaidBlockData;
  /**
   * The page's search with the partner's file open (`?partner=`): a real link, so the name works for a new tab and
   * before hydration. A click opens the file in place (a search-only change that keeps the scroll).
   */
  search: AdminPartnersSearch;
  /** What he has paid this partner so far, as the page counts it (a line still stamping isn't in it yet). */
  paidBefore: { count: number; amount: number };
  motion: SlipMotion;
  rise: number | null;
  onPay: (commission: AdminCommission) => void;
}) {
  const headingId = useId();
  const { partner, name, lines } = block;
  const phoneNumber = partner?.phoneNumber ?? null;
  const sheba = partner?.shebaNumber ?? null;

  /*------ Exit ------*/
  const allLeaving = lines.every((line) => motion.leaving.has(line.id));
  const folding = allLeaving && lines.every((line) => motion.playing.has(line.id));
  // The sum drops as the stamp lands: a line whose exit has started no longer counts.
  const total = lines.filter((line) => !motion.playing.has(line.id)).reduce((sum, line) => sum + line.amount, 0);

  return (
    <li
      inert={allLeaving}
      // A grid of one row, so the fold can collapse it; the gap between slips is padding inside it, so it folds too.
      className={cn("grid grid-rows-[1fr]", folding && "pp-leaving pp-fold")}
    >
      <div className={cn("min-h-0 pb-4", folding && "overflow-hidden")}>
        <article
          aria-labelledby={headingId}
          style={rise !== null ? ({ "--answer-delay": `${rise}s` } as React.CSSProperties) : undefined}
          className={cn(
            ADMIN_PLATE,
            "relative grid overflow-hidden xl:grid-cols-[18rem_minmax(0,1fr)]",
            rise !== null && "answer-in",
          )}
        >
          {/*===== Stub =====*/}
          <div className="relative grid gap-4 border-b-2 border-dashed border-foreground/20 bg-foreground/[0.025] p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-x-8 xl:flex xl:flex-col xl:gap-4 xl:border-e-2 xl:border-b-0 xl:p-6">
            {/*------ Notches ------*/}
            {/* Below `xl` the tear runs across under the head (both bottom corners); from `xl` down its end side. */}
            <span
              aria-hidden
              className={`${NOTCH} -start-2.5 -bottom-2.5 xl:start-auto xl:-end-2.5 xl:-top-2.5 xl:bottom-auto`}
            />
            <span aria-hidden className={`${NOTCH} -end-2.5 -bottom-2.5`} />

            {/*------ Who and How Much ------*/}
            <div className="flex min-w-0 flex-col gap-3 max-md:contents xl:contents">
              <div className="flex min-w-0 flex-col gap-2.5">
                <h2 id={headingId} className={cn(DISPLAY_HEADING, "text-xl break-words")}>
                  <Link
                    to="/admin/partners"
                    search={search}
                    resetScroll={false}
                    className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <bdi>{name}</bdi>
                  </Link>
                </h2>
                {/* With no Sheba the pill stands in the dashed inset instead, where the number would be. */}
                {sheba && (
                  <CustomerContact
                    name={name}
                    phoneNumber={phoneNumber}
                    variant="call"
                    className="[&>span:first-child]:hidden"
                    callClassName="h-10 max-md:h-11"
                  />
                )}
              </div>

              {/*------ Sum ------*/}
              {/* Phones and `xl`: after the Sheba (the order of his hands), on phones one line with the label at the start
                and the sum at the end; `md` to `xl`: at the foot of the start column. */}
              <p className="flex items-baseline justify-between gap-3 max-md:order-last md:mt-auto md:flex-col md:items-start md:gap-1 xl:order-last xl:mt-0">
                <span className="text-xs font-bold text-muted-foreground">جمع پرداخت</span>
                <span className="whitespace-nowrap">
                  <PopNumber value={total} delay={0.1}>
                    <span className="font-display text-[1.75rem] leading-none font-extrabold">
                      {tomanDigits(total)}
                    </span>
                  </PopNumber>{" "}
                  <span className="text-xs font-bold text-muted-foreground">تومان</span>
                </span>
              </p>
            </div>

            {/*------ Where to Send ------*/}
            {sheba ? (
              <ShebaInset sheba={sheba} name={name} />
            ) : (
              <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-dashed border-foreground/25 px-3.5 py-3">
                <p className="text-sm text-pretty text-muted-foreground">هنوز شبا ننوشته؛ زنگ بزن بپرسه.</p>
                <CustomerContact
                  name={name}
                  phoneNumber={phoneNumber}
                  variant="call"
                  className="[&>span:first-child]:hidden"
                  callClassName="h-10 max-md:h-11 max-md:w-full max-md:justify-center"
                />
              </div>
            )}
          </div>

          {/*===== Lines and Foot =====*/}
          <div className="flex min-w-0 flex-col px-4 pt-2 pb-4 sm:px-5 xl:px-6 xl:pt-3 xl:pb-5">
            {/*------ Column Head ------*/}
            {/* Only where a line is one row in fixed tracks; each line says the same to a screen reader. */}
            <div
              aria-hidden
              className={cn(
                "hidden border-b pt-1 pb-2.5 text-xs text-muted-foreground xl:grid",
                LINE_COLUMNS,
                ADMIN_HAIRLINE,
              )}
            >
              <span>مشتری</span>
              <span>خرید</span>
              <span>حساب هدیه‌ی معرفی</span>
              <span className="text-end">هدیه‌ی معرفی</span>
            </div>

            {/*------ Lines ------*/}
            <ul aria-label={`هدیه‌های معرفی ${name}`} className={cn("flex flex-col divide-y", ADMIN_HAIRLINE)}>
              {lines.map((commission) => {
                const playing = motion.playing.has(commission.id);
                return (
                  <CommissionLine
                    key={commission.id}
                    commission={commission}
                    leaving={motion.leaving.has(commission.id)}
                    exit={playing ? { fold: !folding } : null}
                    onPay={() => onPay(commission)}
                  />
                );
              })}
            </ul>

            {/*------ Foot ------*/}
            <p
              className={cn(
                "mt-auto border-t-[3px] border-double pt-3 text-xs leading-5 text-pretty text-muted-foreground",
                "border-foreground/10",
              )}
            >
              {paidBefore.count === 0 ? (
                "هنوز هدیه‌ای بهش پرداخت نکردی."
              ) : (
                <>
                  تا حالا{" "}
                  <PopNumber value={paidBefore.count} delay={0.1}>
                    {formatNumberFa(paidBefore.count)}
                  </PopNumber>{" "}
                  هدیه‌ی معرفی بهش دادی، جمعاً{" "}
                  <PopNumber value={paidBefore.amount} delay={0.1} className="whitespace-nowrap text-foreground/85">
                    {formatToman(paidBefore.amount)}
                  </PopNumber>
                  .
                </>
              )}
            </p>
          </div>
        </article>
      </div>
    </li>
  );
}
