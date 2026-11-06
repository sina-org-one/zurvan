import { MascotCut } from "~/components/mascot-cut";
import { BRICK } from "~/lib/brick";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/account_home/column";

/*===== Steps =====*/
// What happens from here, in order, from the Help page's answers and app-spec F2–F6. It is a sequence, so it is
// numbered. No timings, no promise of a result. A function: the messages are read while rendering, in the page's language.
function steps() {
  return [
    { title: m.account_home_next_intro_title(), line: m.account_home_next_intro_line() },
    { title: m.account_home_next_eval_title(), line: m.account_home_next_eval_line() },
    { title: m.account_home_next_buy_title(), line: m.account_home_next_buy_line() },
    { title: m.account_home_next_train_title(), line: m.account_home_next_train_line() },
  ];
}

/*===== Next Steps Band =====*/
/**
 * «از اینجا به بعد چی می‌شه؟»: the page's one brick band, full-bleed, and its end (the page sets `flushFooter`). The
 * heading stands on the paper over the wall at the start side; at the end side the center's dog sits on the coping,
 * turned away, looking back over his shoulder at the visitor: he is reading the plates with you. No bubble. Four dark
 * plates hang on the wall, side by side from `lg`, two by two on a tablet, stacked on phones.
 *
 * The dog sits on the coping (his block overlaps it by a few pixels, so the cut-out's soft base disappears into the
 * stone). His bushes use physical sides, tied to the picture.
 *
 * Motion (off for reduced motion): the plates rise in one after another as they scroll into view; the dog breathes.
 */
export function NextStepsBand() {
  return (
    <section aria-labelledby="next-steps-title" className="mt-section-sm">
      {/*------ Heading and the Dog on the Coping ------*/}
      <div className={`${COLUMN} flex items-end justify-between gap-6`}>
        <div className="max-w-xl pb-6 lg:pb-8">
          <h2 id="next-steps-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
            {m.account_home_next_title()}
          </h2>
          <p className="mt-2 text-pretty text-muted-foreground">{m.account_home_next_lead()}</p>
        </div>

        <div aria-hidden className="relative me-2 w-20 shrink-0 translate-y-[3%] sm:me-6 sm:w-24 lg:me-12 lg:w-28">
          <div className="absolute -inset-x-full -top-1/4 bottom-0 bg-[radial-gradient(ellipse_40%_55%_at_50%_85%,rgb(255_194_26/0.08),transparent)]" />
          <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[72%] w-[70%]" />
          <MascotCut name="plants" className="lively-sway-2 absolute right-[76%] bottom-0 w-[56%] -scale-x-100" />
          <MascotCut name="look-back" className="lively-breathe relative block w-full" />
        </div>
      </div>

      {/*------ The Wall ------*/}
      <div
        style={{ backgroundImage: `var(--grain), ${BRICK}` }}
        className="relative border-t-2 border-t-foreground/60 surface-inverse py-section-sm"
      >
        <ol className={`${COLUMN} grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6`}>
          {steps().map(({ title, line }, index) => (
            <li
              key={title}
              className={`lively-reveal ah-plate-${index + 1} flex items-start gap-4 rounded-3xl border border-border/50 bg-jet paper-grain p-6 shadow-[0_18px_36px_-18px_rgb(0_0_0/0.9)] lg:flex-col`}
            >
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-black text-primary-foreground"
              >
                {formatNumber(index + 1)}
              </span>
              <div>
                <h3 className="font-display text-xl font-black">{title}</h3>
                <p className="mt-1.5 text-pretty text-muted-foreground">{line}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <style>{`
        @supports (animation-timeline: view()) {
          @media (prefers-reduced-motion: no-preference) {
            .ah-plate-2 { animation-range: entry 10% entry 80%; }
            .ah-plate-3 { animation-range: entry 15% entry 85%; }
            .ah-plate-4 { animation-range: entry 20% entry 90%; }
          }
        }
      `}</style>
    </section>
  );
}
