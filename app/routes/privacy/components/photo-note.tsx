import { Lock } from "lucide-react";

import { m } from "~/paraglide/messages";

/*===== Photo Note =====*/
/**
 * The one note on photos, which are not private and must say so plainly: a grained plate with its lock. On desktop it
 * stands under the contents plate (`privacy.tsx` places it), on phones it follows the list it belongs to.
 */
export function PhotoNote({ className }: { className?: string }) {
  return (
    <div className={`rounded-3xl border border-border bg-card paper-grain p-5 shadow-sm ${className ?? ""}`}>
      <div className="flex items-start gap-3">
        <Lock aria-hidden strokeWidth={1.5} className="mt-1 size-6 shrink-0 text-primary" />
        <div>
          <h3 className="font-extrabold">{m.privacy_photo_title()}</h3>
          <p className="mt-2 text-pretty text-muted-foreground">{m.privacy_photo_text()}</p>
        </div>
      </div>
    </div>
  );
}
