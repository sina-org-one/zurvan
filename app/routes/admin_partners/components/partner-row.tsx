import { cn } from "cn";
import { ChevronLeftIcon } from "lucide-react";

import { CustomerContact } from "~/components/customer-contact";
import { Link } from "~/components/link";
import { formatToman } from "~/lib/course-format";
import { formatNumberFa } from "~/lib/digits";
import type { AdminPartner } from "~/orpc/partner/contract";
import { useChanged } from "~/routes/admin_partners/hooks/use-changed";
import type { AdminPartnersSearch } from "~/routes/admin_partners/search-params";

/*===== Columns =====*/
/**
 * The roster's tracks from `xl`, shared by its column head and every row: the partner (disc and name), the link code,
 * the number, his people, what he is owed and the chevron.
 */
export const ROSTER_COLUMNS =
  "xl:grid-cols-[2.5rem_minmax(0,1.2fr)_9rem_9.5rem_minmax(0,1fr)_8.5rem_1.25rem] xl:gap-x-4";

/**
 * Every row (and the head) is an inner box inset in its hairline band, so an inactive row can draw its dashed outline
 * without touching the hairlines; the head uses the same box, so the columns line up.
 */
export const ROSTER_BOX = "mx-1.5 rounded-2xl border border-transparent px-3 sm:mx-2 sm:px-3.5 xl:px-4";

/*===== Partner Row =====*/
/**
 * One partner in the roster. The name is a stretched link that opens his file in place (`search` keeps it a real link
 * for a new tab and before hydration); the phone link sits above it (`relative z-10`) so it stays tappable.
 *
 * The counts follow the road a person walks and are cumulative, as on the partner's own dashboard: every number he is
 * still counting (lost ones are not), people who signed up (bought ones included), people who bought. What he is owed
 * is ivory, and left out when it is nothing.
 *
 * An inactive partner's row is dimmed with a dashed outline (the vocabulary of Leads' lost row and Users' blocked row),
 * and eases into that look when the switch changes under it; its «غیرفعال» chip is pressed in.
 *
 * - **Phones:** the disc, the name and the chip, what he is owed at the end; the number and the code under it; the
 *   counts last.
 * - **From `xl`:** one row in `ROSTER_COLUMNS`.
 */
export function PartnerRow({
  partner,
  search,
  rise,
}: {
  partner: AdminPartner;
  /** The page's search with this partner's file open (`?partner=`). */
  search: AdminPartnersSearch;
  /** The row's delay (seconds) in a list that just arrived under a new view, or null when it didn't. */
  rise: number | null;
}) {
  const { counts, commissions } = partner;
  const inactive = !partner.isActive;
  const switched = useChanged(partner.isActive);

  return (
    <li
      style={rise !== null ? ({ "--answer-delay": `${rise}s` } as React.CSSProperties) : undefined}
      className={cn("py-1.5", rise !== null && "answer-in")}
    >
      <div
        className={cn(
          ROSTER_BOX,
          "group relative grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5",
          "[grid-template-areas:'disc_name_owed'_'disc_who_who'_'disc_counts_counts'] xl:[grid-template-areas:'disc_name_code_who_counts_owed_open']",
          "transition-[background-color,border-color,opacity] duration-500 hover:bg-foreground/[0.03] has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          ROSTER_COLUMNS,
          inactive && "border-dashed border-foreground/25 opacity-65 hover:opacity-90",
        )}
      >
        {/*------ Disc ------*/}
        <span
          aria-hidden
          className={cn(
            "grid size-10 place-items-center self-start rounded-full bg-card text-base font-extrabold text-muted-foreground ring-1 ring-foreground/15 [grid-area:disc] xl:self-center",
            inactive && "border border-dashed border-foreground/30 bg-transparent ring-0",
          )}
        >
          {[...partner.name.trim()][0] ?? "؟"}
        </span>

        {/*------ Name ------*/}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 [grid-area:name]">
          <Link
            to="/admin/partners"
            search={search}
            resetScroll={false}
            className="min-w-0 rounded-sm text-sm font-bold break-words outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            <bdi>{partner.name}</bdi>
          </Link>
          {/* A customer who refers friends: the same row and gifts as a partner, but no business behind it. */}
          {partner.role === "customer" && (
            <span className="inline-flex h-6 items-center rounded-full border border-foreground/25 px-2 text-xs font-bold text-muted-foreground">
              مشتری
            </span>
          )}
          {inactive && (
            <span
              key="inactive"
              className={cn(
                "inline-flex h-6 items-center rounded-full border border-dashed border-foreground/30 px-2.5 text-xs font-bold text-muted-foreground",
                switched && "pp-chip-stamp",
              )}
            >
              غیرفعال
            </span>
          )}
        </div>

        {/*------ Code ------*/}
        <p className="hidden min-w-0 truncate text-xs text-muted-foreground [grid-area:code] xl:block" dir="ltr">
          <span className="sr-only">کد لینک: </span>
          {partner.code}
        </p>

        {/*------ Number (and the code, below `xl`) ------*/}
        {/* The name is already the row's link: hide the contact's own copy of it, keeping the call link. */}
        <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-x-4 [grid-area:who] [&_a]:min-h-10 xl:[&_a]:min-h-8">
          <CustomerContact
            name={partner.name}
            phoneNumber={partner.phoneNumber}
            className="[&>span:first-child]:hidden"
          />
          <span dir="ltr" className="text-xs text-muted-foreground xl:hidden">
            <span className="sr-only">کد لینک: </span>
            {partner.code}
          </span>
        </div>

        {/*------ Counts ------*/}
        <p className="text-xs text-muted-foreground [grid-area:counts] xl:text-sm">
          {formatNumberFa(counts.lead + counts.registered + counts.bought)} شماره ·{" "}
          {formatNumberFa(counts.registered + counts.bought)} ثبت‌نام · {formatNumberFa(counts.bought)} خرید
        </p>

        {/*------ Owed ------*/}
        <p className="text-end text-sm font-bold whitespace-nowrap tabular-nums [grid-area:owed]">
          {commissions.unpaidAmount > 0 && (
            <>
              <span className="sr-only">منتظر پرداخت: </span>
              {formatToman(commissions.unpaidAmount)}
            </>
          )}
        </p>

        {/*------ Open ------*/}
        <ChevronLeftIcon
          aria-hidden
          strokeWidth={1.7}
          className="hidden size-5 text-muted-foreground transition-colors [grid-area:open] group-hover:text-foreground xl:block"
        />
      </div>
    </li>
  );
}
