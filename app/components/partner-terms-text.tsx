import { cn } from "cn";

import { PARTNER_TERMS_VERSION, partnerTermsSections } from "~/lib/partner-terms";
import { formatDigits } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";

/*===== Partner Terms Text =====*/
/**
 * The partnership's terms (`app/lib/partner-terms.ts`) in a scrolling, ruled box: every partner reads them before the
 * tick, on the application form (`/join/partner`) and on the dashboard. Short enough to read with the wheel or a finger; the tick is right under it.
 */
export function PartnerTermsText({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="partner-terms-title"
      className={cn(
        "max-h-80 overflow-y-auto rounded-2xl border border-foreground/15 bg-background/40 p-4 text-sm leading-relaxed sm:p-5",
        className,
      )}
    >
      <h3 id="partner-terms-title" className="font-display text-lg font-bold text-balance">
        {m.partner_terms_title()}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {m.partner_terms_version({ version: formatDigits(PARTNER_TERMS_VERSION) })}
      </p>
      <p className="mt-3 text-pretty text-muted-foreground">{m.partner_terms_lead()}</p>

      <ol className="mt-4 flex flex-col gap-4">
        {partnerTermsSections().map((section, index) => (
          <li key={section.heading} className="flex flex-col gap-1.5">
            <h4 className="font-bold text-primary">
              {formatDigits(String(index + 1))}. {section.heading}
            </h4>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-pretty text-foreground/85">
                {paragraph}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
