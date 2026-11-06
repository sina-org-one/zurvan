import { cn } from "cn";

import { GroundStrip } from "~/components/ground-strip";
import { MascotCut, type MascotCutName } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";
import { ChalkDefs, PathLine, SketchedEdge } from "~/routes/join_partner/components/chalk-trail";

/*===== Start Steps =====*/
// Joining starts with an application (the owner, 2026-11-06): on this page's form, filled in with a marketer who visited,
// or over the phone; the Admin reviews it and approves, which creates the partner account (app-spec F7). It is a real sequence, so it is numbered, with gold discs as on the home page's evaluation steps. Each step has
// the dog that fits it: he phones, brings the key, and celebrates at the finish flag. `idle` is his own loop.
// A function, not a constant: the words follow the page's language when it renders.
function steps(): { title: string; detail: string; pose: MascotCutName; idle: string }[] {
  return [
    {
      title: m.join_partner_step_call_title(),
      detail: m.join_partner_step_call_detail(),
      pose: "phone",
      idle: "lively-wiggle",
    },
    {
      title: m.join_partner_step_account_title(),
      detail: m.join_partner_step_account_detail(),
      pose: "key-carry",
      idle: "lively-breathe",
    },
    {
      title: m.join_partner_step_in_title(),
      detail: m.join_partner_step_in_detail(),
      pose: "celebrate",
      idle: "lively-hop",
    },
  ];
}

/*===== How To Start =====*/
/**
 * «چطوری شروع می‌شه؟»: the three steps from the first call to a working partner account, numbered as a real sequence
 * and walked on one chalk path across a board. The signpost stands on the board's top edge where the path starts (its
 * arrow points the way it goes), each step's dog stands on a patch of ground above its disc, and the gold flag is
 * planted where the path ends.
 *
 * Wide: three columns, the dog above his disc, the path running across the discs and on to the flag. Phones: the
 * discs in a column with the path down their start side, each dog beside his step's words (above the title).
 *
 * `--zone` is the dog's zone above a disc (7rem on phones, 10rem from `lg`); the path lines sit by it, so it is one
 * number written out in the classes below (Tailwind needs them whole).
 */
export function HowToStart() {
  const STEPS = steps();

  return (
    <section aria-labelledby="start-title" className="relative flex flex-col pt-44 lg:pt-48">
      <ChalkDefs />

      {/*------ Sky over the board's headroom, beside the signpost ------*/}
      <NightSky className="inset-x-0 top-6 h-24 lg:top-4 lg:h-28" />

      <div className="relative flex-1 rounded-[2rem] bg-sunken paper-grain px-5 pt-9 pb-10 md:px-8 lg:px-10 lg:pb-12">
        <SketchedEdge />

        {/*------ The signpost where the path starts ------*/}
        {/* Its straw tufts overlap the edge, so it stands on it. Its arrow points the way the path goes. */}
        <MascotCut
          name="signpost"
          className="absolute start-5 bottom-[calc(100%-0.9rem)] w-24 md:start-8 lg:start-10 lg:w-28 ltr:-scale-x-100"
        />

        <h2 id="start-title" className={`${DISPLAY_HEADING} relative text-h2 text-balance`}>
          {m.join_partner_start_title()}
        </h2>

        {/*------ The steps ------*/}
        <ol className="relative mt-8 grid gap-y-10 lg:mt-10 lg:grid-cols-3 lg:gap-y-0">
          {/* Wide: one chalk path across the three discs and on, past the last one, to the flag. */}
          <PathLine
            direction="across"
            className="jp-draw-across absolute start-[16.67%] end-[calc(16.67%-4.5rem)] top-[calc(10rem+0.25rem+1.75rem-8px)] hidden h-4 opacity-55 lg:block"
          />

          {STEPS.map((step, index) => {
            const last = index === STEPS.length - 1;

            return (
              <li
                key={step.title}
                className={cn(
                  "relative grid grid-cols-[3.5rem_1fr] gap-x-4 gap-y-2",
                  "lg:flex lg:flex-col lg:items-center lg:gap-x-0 lg:px-3 lg:text-center",
                  last && "pb-16 lg:pb-0",
                )}
              >
                {/* Phones: down from this disc's centre to the next one's, across the 2.5rem gap. */}
                {!last && (
                  <PathLine
                    direction="down"
                    className="jp-draw-down absolute start-[calc(1.75rem-8px)] top-[calc(7rem+0.5rem+1.75rem)] h-[calc(100%+2.5rem)] w-4 opacity-55 lg:hidden"
                  />
                )}
                {/* Phones: from the last disc down to the flag. */}
                {last && (
                  <PathLine
                    direction="down"
                    className="jp-draw-down absolute start-[calc(1.75rem-8px)] top-[calc(7rem+0.5rem+1.75rem)] bottom-3 h-[calc(100%-9.25rem-0.75rem)] w-4 opacity-55 lg:hidden"
                  />
                )}

                {/*------ The dog on his patch of ground ------*/}
                <div className="jp-step-dog relative col-start-2 flex h-28 items-end justify-start lg:col-start-auto lg:h-40 lg:w-full lg:justify-center">
                  <div className="relative">
                    {/* The warm pool he stands in, and a bush at each side. */}
                    <div
                      aria-hidden
                      className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_45%_60%_at_50%_85%,rgb(255_194_26/0.08),transparent)]"
                    />
                    <GroundStrip className="absolute inset-x-[-40%] -bottom-1 h-5 [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)] lg:h-6" />
                    <MascotCut
                      name="plants"
                      className="lively-sway absolute bottom-0 left-[92%] w-[40%] translate-y-[3%]"
                    />
                    <MascotCut
                      name="plants"
                      className="lively-sway-2 absolute right-[92%] bottom-0 hidden w-[34%] translate-y-[3%] -scale-x-100 lg:block"
                    />
                    <MascotCut
                      name={step.pose}
                      className={cn(step.idle, "relative block h-24 w-auto translate-y-[3%] lg:h-36")}
                    />
                  </div>
                </div>

                {/*------ The disc ------*/}
                <div className="relative z-10 col-start-1 row-start-2 grid size-14 place-items-center self-start lg:mt-1">
                  <svg
                    aria-hidden
                    viewBox="0 0 64 64"
                    fill="none"
                    className="absolute -inset-1.5 size-[calc(100%+0.75rem)] text-foreground/60"
                  >
                    <path
                      d="M33 3C49 3 61 16 61 32S48 61 32 61 3 47 3 32 16 3 29 4.5"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      filter="url(#jp-chalk)"
                    />
                  </svg>
                  <span
                    aria-hidden
                    className="relative grid size-12 place-items-center rounded-full bg-primary font-display text-xl font-black text-primary-foreground"
                  >
                    {formatNumber(index + 1)}
                  </span>
                </div>

                {/*------ The words ------*/}
                <div className="col-start-2 row-start-2 lg:mt-5">
                  <h3 className="font-display text-lg leading-snug font-bold text-foreground md:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-64 text-[15px] leading-7 text-pretty text-foreground/75 lg:mx-auto">
                    {step.detail}
                  </p>
                </div>

                {/*------ The flag where the path ends ------*/}
                {last && (
                  <>
                    {/* Phones: planted under the last disc; its pole is 18px in from its right edge. */}
                    <MascotCut
                      name="flag"
                      className="lively-sway-2 absolute start-[calc(1.75rem-18px)] bottom-0 w-16 lg:hidden ltr:-scale-x-100"
                    />
                    {/* Wide: planted at the path's end, 4.5rem past the last disc's centre; the pole is 72% across. */}
                    <MascotCut
                      name="flag"
                      className="lively-sway-2 absolute top-[calc(10rem+0.25rem+1.75rem+0.3rem)] left-[calc(50%-4.5rem-46px)] hidden w-16 -translate-y-full lg:block ltr:left-[calc(50%+4.5rem-18px)] ltr:-scale-x-100"
                    />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* The path draws itself as the board scrolls into view (a clip that opens from where the path starts, the start
          side), and each step's dog pops in a little after the one before, both driven by the scroll where the browser
          can; elsewhere they simply show. Off for reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @supports (animation-timeline: view()) {
            .jp-draw-across {
              animation: jp-draw-across linear both;
              animation-timeline: view();
              animation-range: entry 30% cover 45%;
            }
            .jp-draw-down {
              animation: jp-draw-down linear both;
              animation-timeline: view();
              animation-range: entry 20% cover 40%;
            }
            .jp-step-dog {
              animation: lively-reveal-pop linear both;
              animation-timeline: view();
              animation-range: entry 10% entry 80%;
            }
            li:nth-child(3) > .jp-step-dog { animation-range: entry 22% entry 92%; }
            li:nth-child(4) > .jp-step-dog { animation-range: entry 34% entry 100%; }
          }
        }
        /* English reads left to right, so the path opens from the left. */
        :lang(en) .jp-draw-across { animation-name: jp-draw-across-ltr; }
        @keyframes jp-draw-across-ltr {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0); }
        }
        @keyframes jp-draw-across {
          from { clip-path: inset(0 0 0 100%); }
          to { clip-path: inset(0); }
        }
        @keyframes jp-draw-down {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0); }
        }
      `}</style>
    </section>
  );
}
