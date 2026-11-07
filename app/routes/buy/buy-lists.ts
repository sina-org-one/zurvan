import { getDogVerdict, type DogVerdictProblem } from "~/lib/dog-verdict";
import type { IneligibilityKind } from "~/lib/eligibility";
import { formatNumber } from "~/lib/locale-format";
import type { MyDogCourse } from "~/orpc/checkout/contract";
import type { Course } from "~/orpc/course/contract";
import { m } from "~/paraglide/messages";

/*===== Types =====*/
/** One reason a course can't be bought now, with its kind (for the tone) and the way out (`getDogVerdict`'s). */
export type LaterReason = DogVerdictProblem & { kind: IneligibilityKind };

/** A course the picked dog can't take yet, with every reason the server gave, in its order. */
export type LaterCourse = { course: Course; reasons: LaterReason[] };

/** The reason every course in «بعداً باز می‌شن» shares, lifted out once above the rows (in practice: no evaluation). */
export type Gate = { message: string; way: NonNullable<DogVerdictProblem["way"]> };

export type BuyLists = {
  /** «الان می‌تونه»: the courses with a price the server says the dog can buy now. */
  canTake: Course[];
  /** «بعداً باز می‌شن»: every other shown course, with the gate's reason taken out of its rows when there is a gate. */
  later: LaterCourse[];
  gate: Gate | null;
  /** What the picked dog says from its print, about the lists as a whole. */
  line: string;
};

/*===== Split =====*/
/**
 * Splits the shown courses by the server's verdicts for the picked dog (`checkout.dogCourses`), in the catalogue's order.
 * Nothing here judges eligibility: a course is offered only when the server said `eligible` and it has a price, the
 * same verdict the cart and «پرداخت» use.
 *
 * The not-evaluated reason is lifted into a gate when every course on sale in the later list has it: a course without
 * a price only ever carries `not-for-sale` (the server stops there), so it doesn't count against the gate.
 */
export function splitCourses({
  courses,
  verdicts,
  dogId,
}: {
  courses: readonly Course[];
  verdicts: readonly MyDogCourse[];
  dogId: string;
}): BuyLists {
  const canTake: Course[] = [];
  const later: LaterCourse[] = [];

  /*------ Sort Each Course ------*/
  for (const course of courses) {
    const verdict = verdicts.find((entry) => entry.courseSlug === course.slug);
    if (verdict?.eligible && course.price !== null) {
      canTake.push(course);
      continue;
    }
    const problems = verdict && !verdict.eligible ? verdict.problems : [];
    // `getDogVerdict` keeps the server's order, so its reasons line up with the kinds one for one.
    const reasons = getDogVerdict({ dogId, eligible: false, problems }).problems.map((problem, index) => ({
      ...problem,
      kind: problems[index]?.kind ?? "not-for-sale",
    }));
    later.push({ course, reasons: problems.length > 0 ? reasons : [] });
  }

  /*------ The Shared Reason ------*/
  const onSale = later.filter((entry) => entry.course.price !== null);
  const notEvaluated = onSale[0]?.reasons.find((reason) => reason.kind === "not-evaluated");
  const gate =
    notEvaluated?.way && onSale.every((entry) => entry.reasons.some((reason) => reason.kind === "not-evaluated"))
      ? { message: notEvaluated.message, way: notEvaluated.way }
      : null;
  const rows = gate
    ? later.map((entry) => ({ ...entry, reasons: entry.reasons.filter((reason) => reason.kind !== "not-evaluated") }))
    : later;

  /*------ The Dog's Line ------*/
  const firstBlocked = later.find((entry) => entry.course.price !== null && entry.reasons.length > 0);
  const line =
    canTake.length > 0
      ? (canTake.length === 1 ? m.buy_line_can_one : m.buy_line_can_other)({ count: formatNumber(canTake.length) })
      : gate
        ? m.buy_line_gate()
        : firstBlocked
          ? getDogVerdict({
              dogId,
              eligible: false,
              problems: firstBlocked.reasons.map(({ kind, message }) => ({ kind, message, courseSlug: null })),
            }).line
          : m.buy_line_none();

  return { canTake, later: rows, gate, line };
}
