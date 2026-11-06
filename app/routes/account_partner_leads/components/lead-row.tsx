import { cn } from "cn";

import { formatToman } from "~/lib/course-format";
import { formatDigits, formatTimestamp } from "~/lib/locale-format";
import type { PartnerPerson } from "~/orpc/partner/contract";
import { m } from "~/paraglide/messages";
import { HighlightRing } from "~/routes/account_partner_leads/components/highlight-ring";
import { LeadRoad } from "~/routes/account_partner_leads/components/lead-road";
import { stageStatus } from "~/routes/account_partner_leads/stages";

/*===== Constants =====*/
/** The stagger between rows as a list arrives, and the most rows that wait for it (the rest come with the last). */
const ROW_STEP_S = 0.07;
const MAX_STAGGERED = 6;

const STAGE_CHIP: Record<PartnerPerson["stage"], string> = {
  bought: "bg-primary text-primary-foreground",
  registered: "border border-primary/60 text-primary",
  lead: "border border-foreground/25 text-foreground/80",
  lost: "border border-dashed border-foreground/25 text-muted-foreground",
};

/*===== Phone =====*/
/** `09123456789` as «۰۹۱۲ ۳۴۵ ۶۷۸۹» ("0912 345 6789" in English); anything that is not in the stored shape is shown as it is, in the page's digits. */
function formatPhone(phoneNumber: string): string {
  const grouped = /^09\d{9}$/.test(phoneNumber)
    ? `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4, 7)} ${phoneNumber.slice(7)}`
    : phoneNumber;
  return formatDigits(grouped);
}

/*===== Commission =====*/
/** What this partner has earned from a person who bought, and whether the Admin has paid it: «۹٬۵۰۰٬۰۰۰ تومان · منتظر پرداخت» ("9,500,000 Toman · Awaiting payment"). */
function describeCommission(commission: NonNullable<PartnerPerson["commission"]>): string {
  return `${formatToman(commission.amount)} · ${commissionState(commission)}`;
}

/**
 * The state of everything the person has earned him (one commission per purchase, F7): all paid (with the last day one
 * was paid), all waiting, or the part still waiting.
 */
function commissionState(commission: NonNullable<PartnerPerson["commission"]>): string {
  if (commission.unpaidAmount === 0 && commission.paidAt) {
    return m.account_partner_leads_row_paid_on({ date: formatTimestamp(commission.paidAt) });
  }
  return commission.unpaidAmount < commission.amount
    ? m.account_partner_leads_row_awaiting_part({ amount: formatToman(commission.unpaidAmount) })
    : m.account_partner_leads_row_awaiting();
}

/*===== Details =====*/
/**
 * Who a phone lead is about, as the partner wrote it: «سارا · پاپی، ژرمن شپرد، ۸ ماه». Null for a link customer and for
 * leads from before the details were asked (empty strings).
 */
function describeDetails(details: PartnerPerson["details"]): string | null {
  if (!details) return null;
  const dog = [details.dogName, details.dogBreed, details.dogAge]
    .filter(Boolean)
    .join(m.account_partner_leads_row_identity_joiner());
  const parts = [details.guardianName, dog].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/*===== Lead Row =====*/
/**
 * One person of the partner's, a small card: who (the number he typed, and once registered the customer's name; or a
 * link customer's name) with where they came from, the road they are on, and where they stand as a chip. For a buyer, a
 * stub under a dashed rule says what the partner has earned from all their purchases and whether it was paid. Never prices or the customer's own dogs (only what the partner wrote with the number), and a lost
 * person shows no name: the card is grey and dashed (F12).
 *
 * From `xl` it is one line of three parts in fixed columns, so every row's road sits in the same column; below that the
 * road runs full width under who and the chip.
 *
 * The visible content is hidden from screen readers in favour of one sentence, so a reader hears «{who}: {stage}»
 * instead of three stops. It arrives with its list (`pl-row`, staggered by `index`), and a row the partner just added
 * also gets the fading gold ring.
 */
export function LeadRow({
  person,
  index,
  highlighted,
}: {
  person: PartnerPerson;
  index: number;
  highlighted: boolean;
}) {
  const lost = person.stage === "lost";
  const number = person.phoneNumber ? formatPhone(person.phoneNumber) : null;
  const name = person.customerName;
  const details = describeDetails(person.details);
  const delay = Math.min(index, MAX_STAGGERED) * ROW_STEP_S;

  // Who the sentence names: the customer's name and the number he typed, whichever exist.
  const identity = [name, number, details].filter(Boolean).join(m.account_partner_leads_row_identity_joiner());

  return (
    <li
      className={cn(
        "pl-row relative rounded-2xl border p-4 sm:px-5",
        lost ? "border-dashed border-foreground/20" : "border-foreground/10 bg-card paper-grain shadow-sm",
      )}
      style={{ "--answer-delay": `${delay}s` } as React.CSSProperties}
    >
      <p className="sr-only">
        {person.commission
          ? m.account_partner_leads_row_sr_commission({
              identity,
              stage: stageStatus(person.stage),
              commission: describeCommission(person.commission),
            })
          : m.account_partner_leads_row_sr({ identity, stage: stageStatus(person.stage) })}
      </p>

      <div
        aria-hidden
        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-4 xl:grid-cols-[minmax(0,1fr)_14rem_6.75rem] xl:items-center xl:gap-x-5"
      >
        {/*------ Who ------*/}
        <div className="col-start-1 row-start-1 flex min-w-0 flex-col items-start gap-1.5">
          <span className={cn("min-w-0 font-extrabold break-words", lost && "text-muted-foreground")}>
            {name ?? (
              <bdi dir="ltr" className="whitespace-nowrap tabular-nums">
                {number}
              </bdi>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-[0.6875rem] font-bold text-muted-foreground">
              {person.source === "link"
                ? m.account_partner_leads_row_from_link()
                : m.account_partner_leads_row_number()}
            </span>
            {name && number && (
              <bdi dir="ltr" className="text-xs text-muted-foreground tabular-nums">
                {number}
              </bdi>
            )}
          </span>
          {details && <span className="text-xs text-pretty text-muted-foreground">{details}</span>}
        </div>

        {/*------ Road ------*/}
        <div className="col-span-2 row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
          <LeadRoad person={person} delay={delay} />
        </div>

        {/*------ Where They Stand ------*/}
        <div className="col-start-2 row-start-1 xl:col-start-3 xl:justify-self-end">
          <span
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3 text-xs font-bold whitespace-nowrap",
              STAGE_CHIP[person.stage],
            )}
          >
            {stageStatus(person.stage)}
          </span>
        </div>

        {/*------ Commission ------*/}
        {/* Only for someone who bought: what the partner is owed for them and whether it has been paid (never the
            purchase itself, F12). */}
        {person.commission && (
          <div className="col-span-2 row-start-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-foreground/15 pt-3 text-sm xl:col-span-3 xl:row-start-2">
            <span className="text-muted-foreground">{m.account_partner_leads_row_commission()}</span>
            <span className="font-extrabold whitespace-nowrap text-primary tabular-nums">
              {formatToman(person.commission.amount)}
            </span>
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold whitespace-nowrap",
                person.commission.unpaidAmount === 0
                  ? "border border-primary/60 text-primary"
                  : "border border-foreground/15 text-muted-foreground",
              )}
            >
              {commissionState(person.commission)}
            </span>
          </div>
        )}
      </div>

      {highlighted && <HighlightRing />}
    </li>
  );
}
