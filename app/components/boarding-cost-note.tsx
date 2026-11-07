import { cn } from "cn";
import { InfoIcon } from "lucide-react";

import { m } from "~/paraglide/messages";

/*===== Boarding Cost Note =====*/
/**
 * Boarding costs extra, and the extra is never charged here: the center calls to arrange it and agree on the
 * price (F5). A gold-outlined notice, so it is seen next to a price without reading as an alarm.
 */
export function BoardingCostNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl border border-primary/45 bg-primary/[0.06] px-3 py-2 text-sm text-pretty",
        className,
      )}
    >
      <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{m.shared_place_boarding_note()}</span>
    </p>
  );
}
