import { toPersianDigits } from "~/lib/digits";
import { formatJalaliTimestamp } from "~/lib/jalali";
import type { PartnerPerson } from "~/orpc/partner/contract";

/*===== Person Row =====*/
/**
 * One phone lead or link customer in a partner's file, under its stage's heading (the stage is said once, by the
 * group). The first line is what identifies them (the typed number, or the customer's name for someone his link
 * brought), then the dates they reached. A lost person carries no name and no date past the entry: the API gives none
 * (F12), and this adds nothing.
 */
export function PersonRow({ person }: { person: PartnerPerson }) {
  const dates = [
    person.source === "link"
      ? `ثبت‌نام ${formatJalaliTimestamp(person.createdAt)}`
      : `ثبت شماره ${formatJalaliTimestamp(person.createdAt)}`,
    person.source === "phone" && person.registeredAt ? `ثبت‌نام ${formatJalaliTimestamp(person.registeredAt)}` : null,
    person.boughtAt ? `خرید ${formatJalaliTimestamp(person.boughtAt)}` : null,
  ].filter(Boolean);

  // What the partner wrote with the number (the owner, 2026-11-06): the guardian, and the dog's name, breed and age.
  const details = person.details
    ? [
        person.details.guardianName,
        [person.details.dogName, person.details.dogBreed, person.details.dogAge].filter(Boolean).join("، "),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <li className="py-2.5">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
        {person.phoneNumber && (
          <bdi dir="ltr" className="tabular-nums">
            {toPersianDigits(person.phoneNumber)}
          </bdi>
        )}
        {person.customerName && (
          <span className={person.phoneNumber ? "font-normal text-muted-foreground" : undefined}>
            <bdi>{person.customerName}</bdi>
          </span>
        )}
        {person.source === "link" && <span className="text-xs font-normal text-muted-foreground">از لینک</span>}
      </p>
      {details && (
        <p className="mt-0.5 text-xs text-foreground/80">
          <bdi>{details}</bdi>
        </p>
      )}
      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
        {dates.map((date) => (
          <span key={date} className="whitespace-nowrap">
            {date}
          </span>
        ))}
      </p>
    </li>
  );
}
