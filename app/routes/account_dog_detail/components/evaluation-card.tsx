import { cn } from "cn";

import { EvaluationStatusBadge } from "~/components/evaluation-status-badge";
import { WithdrawEvaluationButton } from "~/components/withdraw-evaluation-button";
import { formatDate, formatTimestamp } from "~/lib/locale-format";
import { EVALUATION_PERIOD_LABELS, EVALUATION_WEEKDAY_LABELS } from "~/orpc/evaluation/constants";
import type { Evaluation } from "~/orpc/evaluation/contract";
import { EvaluationMedia } from "~/routes/account_dog_detail/components/evaluation-media";
import { useChanged } from "~/routes/account_dog_detail/components/use-changed";
import { PLATE } from "~/routes/account_dog_detail/plate";
import { m } from "~/paraglide/messages";

/*===== Evaluation Card =====*/
/**
 * One evaluation of this dog, on a grained plate: its status and date, what the owner asked for (earliest date, free
 * days and times), the Admin's reason when he rejected it, and what was sent with it. An evaluation the Admin recorded
 * himself has no request behind it, so it has no dates to show and no media.
 *
 * When the status changes under the page (the request withdrawn, which refetches the page's queries), the status row arrives
 * again (`answer-in`, keyed by the status) and the withdraw button leaves; on the first load nothing moves.
 */
export function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const asked = !evaluation.createdByAdmin && evaluation.earliestDate !== null;
  const changed = useChanged(evaluation.status);

  return (
    <li className={cn(PLATE, "flex flex-col gap-4 p-5 sm:p-6")}>
      {/*------ Status ------*/}
      <div
        key={evaluation.status}
        className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2", changed && "answer-in")}
      >
        <EvaluationStatusBadge status={evaluation.status} />
        <p className="text-sm text-muted-foreground">{formatTimestamp(evaluation.createdAt)}</p>
      </div>

      {/*------ What Was Asked ------*/}
      {evaluation.createdByAdmin ? (
        <p className="text-pretty text-muted-foreground">{m.account_dog_detail_evaluation_by_admin()}</p>
      ) : (
        asked && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Detail term={m.account_dog_detail_evaluation_earliest()} detail={formatDate(evaluation.earliestDate!)} />
            <Detail
              term={m.account_dog_detail_evaluation_days()}
              detail={evaluation.availableDays
                .map((day) => EVALUATION_WEEKDAY_LABELS[day])
                .join(m.shared_when_free_joiner())}
            />
            <Detail
              term={m.account_dog_detail_evaluation_periods()}
              detail={evaluation.availablePeriods
                .map((period) => EVALUATION_PERIOD_LABELS[period])
                .join(m.shared_when_free_joiner())}
            />
          </dl>
        )
      )}

      {evaluation.status === "rejected" && evaluation.rejectionReason && (
        <p className="text-pretty text-muted-foreground">
          <span className="font-bold text-foreground">{m.account_dog_detail_reason()} </span>
          {/* The Admin writes in Persian: isolated, so its punctuation stays put on the English page. */}
          <bdi>{evaluation.rejectionReason}</bdi>
        </p>
      )}

      {/*------ Media ------*/}
      {!evaluation.createdByAdmin && <EvaluationMedia evaluation={evaluation} />}

      {/*------ Withdraw ------*/}
      {evaluation.status === "requested" && (
        <div>
          <WithdrawEvaluationButton evaluationId={evaluation.id} dogName={evaluation.dog.name} />
        </div>
      )}
    </li>
  );
}

function Detail({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="mt-0.5 font-bold text-pretty">{detail || "—"}</dd>
    </div>
  );
}
