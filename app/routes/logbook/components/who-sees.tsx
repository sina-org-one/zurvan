import { EyeOffIcon, NotebookPenIcon, PawPrintIcon } from "lucide-react";

import { MascotCut } from "~/components/mascot-cut";
import { BRICK } from "~/lib/brick";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/logbook/column";

/*===== Plates =====*/
// Who sees a dog's record, in the order a visitor asks: «am I the owner?», «who else can?», «and me, a stranger?». The
// facts are app-spec F14 and the loader's: the owner is sent from the QR code to their dog's page, Zurvan's trainers
// (through the Admin) read every dog's file and write in the diary after a session, everyone else sees only that the
// record is private (no dog's name, nothing else, whether or not the number exists).
// A function, not a constant: the words follow the page's language when it renders.
function plates() {
  return [
    { icon: PawPrintIcon, title: m.logbook_who_owner_title(), line: m.logbook_who_owner_line() },
    {
      icon: NotebookPenIcon,
      title: m.logbook_who_trainer_title(),
      line: m.logbook_who_trainer_line(),
    },
    { icon: EyeOffIcon, title: m.logbook_who_others_title(), line: m.logbook_who_others_line() },
  ];
}

/*===== Who Sees =====*/
/**
 * «پرونده‌ی هر سگ پیش کیه؟»: the page's one brick band, shared by the lookup and the private state. The heading sits on
 * the wall and three dark plates hang under it (side by side from `lg`, stacked on phones), so the words stay legible
 * on the brick. The `peek` dog looks over the coping at the start side: his box ends on the coping and is sunk by his
 * paws' length (his cut ends in a flat line under the chin, 89% down), so the chin rests on the stone and the paws hang
 * over it. The page that uses this band leaves the room above it for him, and ends on it (`flushFooter`).
 *
 * Motion (off for reduced motion, which shows the finished band): the plates rise in as they scroll into view, each a
 * little later than the one before, and the dog rises from behind the coping (the clip moves with him, so nothing
 * shows below the stone until he is up) and then breathes. Where scroll-driven animation isn't supported they just show.
 */
export function WhoSees() {
  return (
    <section
      aria-labelledby="logbook-who-title"
      style={{ backgroundImage: `var(--grain), ${BRICK}` }}
      className="relative border-t-2 border-t-foreground/60 surface-inverse py-section-sm"
    >
      {/*------ The Dog Over the Coping ------*/}
      <div aria-hidden className={`${COLUMN} pointer-events-none absolute inset-x-0 bottom-full`}>
        <div className="relative ms-[4%] w-24 translate-y-[11%] sm:w-28 lg:ms-[10%]">
          <MascotCut name="plants" className="lively-sway absolute bottom-[12%] left-[82%] w-[56%]" />
          <MascotCut name="plants" className="lively-sway-2 absolute right-[84%] bottom-[12%] w-[44%] -scale-x-100" />
          <div className="lb-peek relative">
            <MascotCut name="peek" className="lively-breathe block w-full" />
          </div>
        </div>
      </div>

      <div className={COLUMN}>
        <h2 id="logbook-who-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
          {m.logbook_who_title()}
        </h2>

        <ul className="mt-8 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {plates().map(({ icon: Icon, title, line }, index) => (
            <li
              key={title}
              className={`lively-reveal lb-plate-${index + 1} flex items-start gap-4 rounded-3xl border border-border/50 bg-jet paper-grain p-6 shadow-[0_18px_36px_-18px_rgb(0_0_0/0.9)] lg:flex-col lg:gap-5`}
            >
              <span
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/50 text-primary"
              >
                <Icon strokeWidth={1.8} className="size-6" />
              </span>
              <div>
                <h3 className="font-display text-xl font-black">{title}</h3>
                <p className="mt-1.5 text-pretty text-muted-foreground">{line}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @supports (animation-timeline: view()) {
          @media (prefers-reduced-motion: no-preference) {
            .lb-plate-2 { animation-range: entry 12% entry 82%; }
            .lb-plate-3 { animation-range: entry 19% entry 89%; }
            .lb-peek {
              animation: lb-peek linear both;
              animation-timeline: view();
              animation-range: entry 40% cover 45%;
            }
          }
        }
        @keyframes lb-peek {
          0% { transform: translateY(90%); clip-path: inset(-30% -30% 101% -30%); }
          80% { transform: translateY(-3%); clip-path: inset(-30% -30% 8% -30%); }
          90% { transform: none; clip-path: inset(-30% -30% 11% -30%); }
          100% { transform: none; clip-path: inset(-30% -30% -10% -30%); }
        }
      `}</style>
    </section>
  );
}
