import { cn } from "cn";
import { InfoIcon } from "lucide-react";

import { BoardingCostNote } from "~/components/boarding-cost-note";
import { EnrollmentStatusBadge } from "~/components/enrollment-status-badge";
import { Link } from "~/components/link";
import { PlaceChip } from "~/components/place-chip";
import { formatToman } from "~/lib/course-format";
import type { Payment } from "~/orpc/checkout/contract";
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from "~/orpc/enrollment/constants";
import type { Media } from "~/orpc/media/contract";
import { m } from "~/paraglide/messages";

import { TapedPrint } from "./taped-print";

/*===== Enrollment Status Guard =====*/
// The contract types an enrollment's status as a plain string; the badge only knows the three real ones.
function isEnrollmentStatus(status: string): status is EnrollmentStatus {
  return (ENROLLMENT_STATUSES as readonly string[]).includes(status);
}

/*===== Enrollment Line =====*/
/**
 * What a paid item turned into. A failed or pending payment bought nothing yet, so it says nothing. A paid item with no
 * enrollment is the one case that needs the trainer (F5): the money arrived but the course was not registered, so the
 * page says so plainly on a small gold-outlined notice (it is the one line that needs him, not an alarm). No refund UI.
 */
function EnrollmentLine({
  paymentStatus,
  enrollment,
}: {
  paymentStatus: Payment["status"];
  enrollment: Payment["items"][number]["enrollment"];
}) {
  if (paymentStatus !== "paid") return null;

  if (enrollment && isEnrollmentStatus(enrollment.status)) {
    return <EnrollmentStatusBadge status={enrollment.status} />;
  }

  return (
    <p className="flex max-w-lg basis-full items-start gap-2 rounded-2xl border border-primary/45 bg-primary/[0.06] px-3 py-2 text-sm text-pretty">
      <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{m.account_purchases_line_no_enrollment()}</span>
    </p>
  );
}

/*===== Payment Line =====*/
/**
 * One bought course on a slip: the dog's photo as a small taped print (a payment item carries only the dog's id and
 * name; the page looks the photo up in the customer's dogs, and a dog no longer listed gets its engraved initial), the
 * dog's name in gold leading to its page, where the enrollment lives, the course, where it is taught, what it turned
 * into, and its price at the end (under the words on phones, where the row is too narrow for a third column). Boarding
 * repeats the note that its cost is apart: the price beside it is the course's alone.
 */
export function PaymentLine({
  item,
  paymentStatus,
  photo,
  index,
}: {
  item: Payment["items"][number];
  paymentStatus: Payment["status"];
  photo: Media | null;
  /** The line's place on the slip: the prints' tilt alternates. */
  index: number;
}) {
  const muted = paymentStatus === "failed";

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-1.5 py-5 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5",
        index > 0 && "border-t border-dashed border-foreground/15",
      )}
    >
      {/*------ Dog ------*/}
      <TapedPrint
        name={item.dog.name}
        photo={photo}
        tilt={index % 2 ? "rotate-2" : "-rotate-3"}
        className={cn("row-span-2 mt-1 sm:row-span-1", muted && "opacity-60 grayscale-[50%]")}
      />

      {/*------ Words ------*/}
      <div className="min-w-0">
        <Link
          to="/account/dogs/$dogId"
          params={{ dogId: item.dog.id }}
          className="inline-block min-h-6 rounded-sm text-sm font-bold text-primary underline-offset-4 hover:underline"
        >
          <bdi>{item.dog.name}</bdi>
        </Link>
        <h4 className={cn("font-sans text-base font-bold text-pretty sm:text-lg", muted && "text-muted-foreground")}>
          {item.course.title}
        </h4>
        {/* The place and the enrollment's status side by side; the no-enrollment notice takes its own line. */}
        {(item.place || paymentStatus === "paid") && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {item.place && <PlaceChip place={item.place} />}
            <EnrollmentLine paymentStatus={paymentStatus} enrollment={item.enrollment} />
          </div>
        )}
        {/* A failed payment bought nothing, so there is no boarding to arrange. */}
        {item.place === "boarding" && !muted && <BoardingCostNote className="mt-2.5 max-w-lg" />}
      </div>

      {/*------ Price ------*/}
      <p
        className={cn(
          "col-start-2 font-bold whitespace-nowrap tabular-nums sm:col-start-3 sm:row-start-1 sm:pt-6 sm:text-end",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {formatToman(item.price)}
      </p>
    </li>
  );
}
