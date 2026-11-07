import { CircleAlertIcon } from "lucide-react";

import { Link } from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import type { Gate } from "~/routes/buy/buy-lists";
import { StagePanel } from "~/routes/buy/components/stage-panel";
import { m } from "~/paraglide/messages";

/*===== Gate Panel =====*/
/**
 * The reason every course on sale shares for this dog (in practice: it hasn't been evaluated), said once instead of on
 * every row: the server's sentence in plain words with an icon, and the gold «ارزیابی رایگان» for this dog. The
 * center's dog keeps the padlocked garden gate; his bubble says the same thing as flavour.
 */
export function GatePanel({ gate, arrive }: { gate: Gate; arrive: boolean }) {
  return (
    <StagePanel
      titleId="gate-title"
      title={m.buy_gate_title()}
      arrive={arrive}
      scene={{
        box: [19, 25],
        scenery: { name: "gate", width: [10.5, 15], left: [0, 0] },
        dog: { name: "padlock", height: [8, 12], left: [9.75, 13.5], head: 0.66 },
        bubble: m.buy_gate_bubble(),
      }}
    >
      <p className="mt-4 flex max-w-lg items-start gap-2.5 text-pretty text-destructive">
        <CircleAlertIcon aria-hidden strokeWidth={2} className="mt-1 size-5 shrink-0" />
        <span>{gate.message}</span>
      </p>
      <p className="mt-3 max-w-lg text-pretty text-muted-foreground">{m.buy_gate_text()}</p>
      <Link
        {...gate.way.link}
        className={buttonVariants({ variant: "solid", size: "lg", className: "mt-7 w-full sm:w-fit sm:min-w-48" })}
      >
        {gate.way.label}
      </Link>
    </StagePanel>
  );
}
