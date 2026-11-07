import { type LinkOptions, linkOptions } from "@tanstack/react-router";

import type { Dog } from "~/orpc/dog/contract";
import type { Enrollment } from "~/orpc/enrollment/contract";
import type { Evaluation } from "~/orpc/evaluation/contract";
import type { EvaluationStatus } from "~/orpc/evaluation/constants";
import { m } from "~/paraglide/messages";

/*===== Dog Status =====*/
// Where a dog stands in the customer's eyes (docs/app-spec.md, F2/F3/F6), worked out once so the Dashboard's cards and
// Dog Detail's header say the same thing: the words the dog speaks in its bubble, the one thing to do next, and which
// evaluation (if any) is still waiting. Worded in the page's language when called (render time). Browser-safe.

export type DogStatusKind = "unseen" | "rejected" | "waiting" | "evaluated" | "training";

export type DogStatus = {
  kind: DogStatusKind;
  /** The dog's own words, for its chalk bubble. */
  line: string;
  /** The badge to show beside the name; null for a dog nobody has evaluated or answered yet. */
  badge: EvaluationStatus | null;
  /** The page's one main action for this dog; null while it only waits for the Admin. */
  action: { label: string; link: LinkOptions } | null;
  /** The request waiting for the Admin's answer, so «پس گرفتن درخواست» knows which one. */
  waitingEvaluation: Evaluation | null;
  /** The Admin's reason, for a dog whose latest request was rejected. */
  rejectionReason: string | null;
};

/**
 * @param evaluations This dog's evaluations, newest first (as `evaluation.listMine` returns them). Other dogs' are ignored.
 * @param enrollments This dog's enrollments; other dogs' are ignored.
 */
export function getDogStatus({
  dog,
  evaluations,
  enrollments,
}: {
  dog: Dog;
  evaluations: readonly Evaluation[];
  enrollments: readonly Enrollment[];
}): DogStatus {
  const own = evaluations.filter((evaluation) => evaluation.dog.id === dog.id);
  const waitingEvaluation = own.find((evaluation) => evaluation.status === "requested") ?? null;
  const coursesAction = { label: m.shared_dog_status_see_courses(), link: linkOptions({ to: "/courses" }) };
  const evaluationAction = (label: string) => ({
    label,
    link: linkOptions({ to: "/assessment", search: { dog: dog.id } }),
  });

  /*------ Evaluated ------*/
  // The dog's own flag first: it is also set for a dog the Admin marked evaluated with no request.
  if (dog.isEvaluated) {
    const training = enrollments.some((enrollment) => enrollment.dog.id === dog.id && enrollment.status === "active");
    return {
      kind: training ? "training" : "evaluated",
      line: training ? m.shared_dog_status_training() : m.shared_dog_status_evaluated(),
      badge: "evaluated",
      action: coursesAction,
      waitingEvaluation: null,
      rejectionReason: null,
    };
  }

  /*------ Waiting ------*/
  if (waitingEvaluation) {
    return {
      kind: "waiting",
      line: m.shared_dog_status_waiting(),
      badge: "requested",
      action: null,
      waitingEvaluation,
      rejectionReason: null,
    };
  }

  /*------ Rejected, or Never Asked ------*/
  const latest = own[0];
  if (latest?.status === "rejected") {
    return {
      kind: "rejected",
      line: m.shared_dog_status_rejected(),
      badge: "rejected",
      action: evaluationAction(m.shared_dog_status_evaluate_again()),
      waitingEvaluation: null,
      rejectionReason: latest.rejectionReason,
    };
  }

  return {
    kind: "unseen",
    line: m.shared_dog_status_unseen(),
    badge: null,
    action: evaluationAction(m.shared_dog_status_free_evaluation()),
    waitingEvaluation: null,
    rejectionReason: null,
  };
}
