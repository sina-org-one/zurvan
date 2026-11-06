import { type LinkOptions, linkOptions } from "@tanstack/react-router";

import type { IneligibilityKind } from "~/lib/eligibility";
import { m } from "~/paraglide/messages";

/*===== Dog Verdict =====*/
// What a dog says about a course, from `checkout.eligibility` or `checkout.review` (docs/app-spec.md, F4). The server's messages are written
// about the dog in the third person («لئو اول باید دوره‌ی … رو تموم کنه»), so the bubble speaks a short first-person line
// chosen by the kind of the first problem, and the server's own message goes under it as the exact reason.

/** The dog's first-person line for the reason it can't take the course, in the page's language (`messages/shared/`). */
const PROBLEM_LINES: Record<IneligibilityKind, () => string> = {
  "not-for-sale": () => m.shared_verdict_not_for_sale(),
  "not-evaluated": () => m.shared_verdict_not_evaluated(),
  prerequisite: () => m.shared_verdict_prerequisite(),
  "too-young": () => m.shared_verdict_too_young(),
  "too-old": () => m.shared_verdict_too_old(),
  "active-enrollment": () => m.shared_verdict_active_enrollment(),
};

export type DogVerdictProblem = {
  /** The server's reason, as it is (worded in the page's language: `checkout.eligibility` reads it from the request). */
  message: string;
  /** Where the customer can go to fix it: the free evaluation, or the prerequisite course. Null when only time helps. */
  way: { label: string; link: LinkOptions } | null;
};

export type DogVerdict = {
  can: boolean;
  /** The dog's own words, for its chalk bubble. */
  line: string;
  /** Every reason, in the server's order (evaluation, prerequisites, age, active enrollment). Empty when `can`. */
  problems: DogVerdictProblem[];
};

/** What `getDogVerdict` needs: `DogEligibility` and a reviewed cart item both fit. */
export type VerdictInput = {
  dogId: string;
  eligible: boolean;
  problems: readonly { kind: IneligibilityKind; message: string; courseSlug: string | null }[];
};

/** Turns one dog's eligibility into the bubble's line, the reasons and the way out of each. */
export function getDogVerdict({ dogId, eligible, problems }: VerdictInput): DogVerdict {
  if (eligible) return { can: true, line: m.shared_verdict_can(), problems: [] };

  return {
    can: false,
    line: PROBLEM_LINES[problems[0]?.kind ?? "not-for-sale"](),
    problems: problems.map((problem) => ({
      message: problem.message,
      way:
        problem.kind === "not-evaluated"
          ? {
              label: m.shared_verdict_way_evaluation(),
              link: linkOptions({ to: "/assessment", search: { dog: dogId } }),
            }
          : problem.kind === "prerequisite" && problem.courseSlug
            ? {
                label: m.shared_verdict_way_course(),
                link: linkOptions({ to: "/courses/$slug", params: { slug: problem.courseSlug } }),
              }
            : null,
    })),
  };
}
