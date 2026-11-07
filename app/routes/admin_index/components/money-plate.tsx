import { linkOptions, type RegisteredRouter, type ValidateLinkOptions } from "@tanstack/react-router";
import { cn } from "cn";

import { Link } from "~/components/link";
import { formatToman } from "~/lib/course-format";
import { ADMIN_HAIRLINE, ADMIN_PLATE } from "~/lib/admin-plate";
import { formatNumberFa, toPersianDigits } from "~/lib/digits";
import { JALALI_MONTHS } from "~/lib/jalali";
import type { DashboardOverview } from "~/orpc/dashboard/contract";

import { tomanDigits } from "../money";
import { PopNumber } from "./pop-number";
import { TileChevron } from "./tile-chevron";

/** The paid payments, where every amount of taken money leads. */
const PAID_PAYMENTS = linkOptions({ to: "/admin/payments", search: { view: "paid" } });

/*===== Money Row =====*/
type MoneyRowProps<TOptions = unknown> = {
  label: string;
  note?: string;
  value: number;
  /** Where the row goes: typed link options (`linkOptions(...)`), checked at the call site. */
  link: ValidateLinkOptions<RegisteredRouter, TOptions>;
};

/** A label and its amount, the whole row the link to the list behind it. */
function MoneyRow<TOptions>(props: MoneyRowProps<TOptions>): React.ReactNode;
function MoneyRow({ label, note, value, link }: MoneyRowProps) {
  return (
    <Link
      {...link}
      className="group flex min-h-14 items-center gap-3 px-5 py-3 transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] sm:px-6"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-pretty">{label}</span>
        {note && <span className="block text-xs text-muted-foreground">{note}</span>}
      </span>
      <span className="text-sm font-bold whitespace-nowrap tabular-nums">
        <PopNumber value={value}>{formatToman(value)}</PopNumber>
      </span>
      <TileChevron className="size-4" />
    </Link>
  );
}

/*===== Money Plate =====*/
/**
 * «پول», kept plain (F11): what was taken this Jalali month, big in Estedad and ivory (never gold: money taken isn't
 * work waiting), what was taken in all, and the commissions not paid yet, which link to the Partners page where he pays
 * them. «دریافتی», never «سود»: refunds are recorded on Payments but not subtracted here, so the footnote says so.
 */
export function MoneyPlate({ money }: { money: DashboardOverview["money"] }) {
  // The year is written digit by digit: `formatNumberFa` would group it as «۱٬۴۰۵».
  const monthLabel = `${JALALI_MONTHS[money.month.month - 1]} ${toPersianDigits(String(money.month.year))}`;
  const digits = tomanDigits(money.salesThisMonth);

  return (
    <div className="flex h-full flex-col">
      <div className={cn(ADMIN_PLATE, "flex-1 overflow-hidden")}>
        {/*===== This Month =====*/}
        <Link
          {...PAID_PAYMENTS}
          className="group flex items-end gap-3 px-5 pt-5 pb-4 transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] sm:px-6"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-muted-foreground">دریافتی {monthLabel}</span>
            <span className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
              {/* A billion and up steps down a size, so the amount never wraps on a phone. */}
              <span
                className={cn(
                  "font-display leading-none font-black whitespace-nowrap",
                  digits.length > 11 ? "text-3xl" : "text-4xl",
                  money.salesThisMonth === 0 && "text-muted-foreground",
                )}
              >
                <PopNumber value={money.salesThisMonth}>{digits}</PopNumber>
              </span>
              <span className="text-sm font-bold text-muted-foreground">تومان</span>
            </span>
          </span>
          <TileChevron className="mb-1 size-4" />
        </Link>

        {/*===== Rows =====*/}
        <div className={cn("divide-y border-t", ADMIN_HAIRLINE)}>
          <MoneyRow label="دریافتی تا امروز" value={money.salesTotal} link={PAID_PAYMENTS} />
          <MoneyRow
            label="هدیه‌ی معرفی پرداخت‌نشده"
            note={`${formatNumberFa(money.unpaidCommissions.count)} مورد`}
            value={money.unpaidCommissions.amount}
            // «unpaid» is the Partners page's default view, so the link leaves `?view=` out.
            link={linkOptions({ to: "/admin/partners" })}
          />
        </div>
      </div>

      {/*===== Footnote =====*/}
      <p className="mt-3 px-1 text-xs text-pretty text-muted-foreground">
        بازپرداخت‌ها توی صفحه‌ی پرداخت‌ها ثبت می‌شن و از این عددها کم نمی‌شن.
      </p>
    </div>
  );
}
