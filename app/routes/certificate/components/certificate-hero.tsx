import { BadgeCheckIcon, BanIcon, SearchXIcon } from "lucide-react";

import { RetryForm } from "~/routes/certificate/components/retry-form";
import { RevokedCard } from "~/routes/certificate/components/revoked-card";
import { ValidCard } from "~/routes/certificate/components/valid-card";
import { VerdictDisc } from "~/routes/certificate/components/verdict-disc";
import { VerdictStage } from "~/routes/certificate/components/verdict-stage";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import type { CertificateVerification } from "~/orpc/certificate/contract";
import { m } from "~/paraglide/messages";

/*===== Certificate Hero =====*/
/**
 * The verdict, first: its h1 with a small round icon, then what the answer shows (the result card, the revoked line, or
 * the line and the retry form), with the stage beside it (above it on phones, so the h1 stays on the first screen).
 *
 * The page keys this component by the number in the address, so a new answer (the retry form's) mounts it afresh: the
 * words rise in (`answer-in`) and the new state's load moment plays again.
 *
 * The load moments (`cv-*`, off for reduced motion, which shows the finished page):
 * - valid: the card rises at 0.1s, the seal stamps on it at 0.5s, the bubble pops at 1.0s.
 * - revoked: the card rises, the sorry dog settles a little lower at 0.4s, the bubble pops at 0.9s.
 * - unknown: the dog walks in along the path (0 to 0.8s) and the bubble pops when he arrives.
 */
export function CertificateHero({ verification }: { verification: CertificateVerification }) {
  return (
    <section
      aria-labelledby="certificate-title"
      className="site-container grid gap-y-6 pt-section-sm lg:grid-cols-12 lg:gap-x-12 lg:gap-y-0"
    >
      {/*===== Words =====*/}
      <div className="answer-in order-2 lg:order-1 lg:col-span-7 lg:self-center">
        {verification.kind === "valid" && (
          <>
            <div className="flex items-center gap-3.5">
              <VerdictDisc tone="gold">
                <BadgeCheckIcon strokeWidth={1.8} />
              </VerdictDisc>
              <h1 id="certificate-title" className={`${DISPLAY_HEADING} text-h1 text-balance`}>
                {m.certificate_hero_valid_lead()}{" "}
                <span className="text-primary">{m.certificate_hero_valid_word()}</span>
              </h1>
            </div>
            <ValidCard
              course={verification.course}
              dogName={verification.dogName}
              issuedAt={verification.issuedAt}
              number={verification.number}
            />
          </>
        )}

        {verification.kind === "revoked" && (
          <>
            <div className="flex items-center gap-3.5">
              <VerdictDisc tone="red">
                <BanIcon strokeWidth={1.8} />
              </VerdictDisc>
              <h1 id="certificate-title" className={`${DISPLAY_HEADING} text-h1 text-balance`}>
                {m.certificate_hero_revoked_title()}
              </h1>
            </div>
            <RevokedCard number={verification.number} revokedAt={verification.revokedAt} />
          </>
        )}

        {verification.kind === "unknown" && (
          <>
            <div className="flex items-center gap-3.5">
              <VerdictDisc tone="muted">
                <SearchXIcon strokeWidth={1.8} />
              </VerdictDisc>
              <h1 id="certificate-title" className={`${DISPLAY_HEADING} text-h1 text-balance`}>
                {m.certificate_hero_unknown_title()}
              </h1>
            </div>
            <p className="mt-4 max-w-md text-lead text-pretty text-muted-foreground">
              {m.certificate_hero_unknown_line()}
            </p>
            <RetryForm />
          </>
        )}
      </div>

      {/*===== Stage =====*/}
      <VerdictStage kind={verification.kind} />

      {/* Load moments. Transform origins: the bubble's tail is 36px in from its right edge, bottom. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .cv-card { animation: cv-rise .55s cubic-bezier(.2,.8,.2,1) .1s both; }
          .cv-seal { animation: cv-stamp .55s cubic-bezier(.3,1.3,.5,1) .5s both; }
          .cv-pop {
            transform-origin: calc(100% - 36px) 100%;
            animation: answer-pop .38s cubic-bezier(.3,1.45,.5,1) 1s both;
          }
          .cv-settle { animation: cv-sink .6s ease-out .4s both; }
          .cv-walk { animation: cv-walk .8s cubic-bezier(.25,.7,.35,1) both; }
          .cv-bob { animation: cv-bob .2s ease-in-out 4 both; }
          .cv-walk ~ .cv-pop { animation-delay: .9s; }
        }
        @keyframes cv-rise {
          from { opacity: 0; transform: translateY(1.4rem); }
          to { opacity: 1; transform: none; }
        }
        /* Big and tilted, it lands with a small overshoot and rests. */
        @keyframes cv-stamp {
          0% { opacity: 0; transform: scale(1.7) rotate(14deg); }
          45% { opacity: 1; transform: scale(.92) rotate(-3deg); }
          65% { transform: scale(1.04) rotate(1deg); }
          100% { opacity: 1; transform: none; }
        }
        @keyframes cv-sink {
          from { transform: translateY(-4%); }
          to { transform: none; }
        }
        @keyframes cv-walk {
          from { opacity: 0; transform: translateX(-38%); }
          25% { opacity: 1; }
          to { opacity: 1; transform: none; }
        }
        @keyframes cv-bob {
          0%, 100% { transform: none; }
          50% { transform: translateY(-2.5%); }
        }
      `}</style>
    </section>
  );
}
