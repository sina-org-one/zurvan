import { cn } from "cn";

import { ChalkBubble } from "~/components/chalk-bubble";
import { GroundStrip } from "~/components/ground-strip";
import { MASCOT_CUTS, MascotCut, type MascotCutName } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";
import { guideFor, nextSteps as nextStepsFor, type GuideMood, type Pose } from "~/routes/assessment/guide";
import { useChanged } from "~/routes/assessment/hooks/use-changed";

/*===== Geometry =====*/
/** How far a piece of scenery tucks in behind or in front of him, in the stage's units. */
const OVERLAP = 1.5;

function heightOf({ name, width }: { name: MascotCutName; width: number }): number {
  return (width * MASCOT_CUTS[name].height) / MASCOT_CUTS[name].width;
}

/**
 * Where the dog and his piece of scenery stand inside a scene `sceneWidth` wide, and where his head is, all in the
 * scene's units (rem on the phone band, `--u` on the desktop stage). `start` is where the group begins: centred on the
 * desktop stage, at the left end on the phone band.
 */
function layout({ pose, phone, sceneWidth }: { pose: Pose; phone: boolean; sceneWidth: number | null }) {
  const width = phone ? pose.phone : pose.width;
  const scenery = pose.scenery ? { ...pose.scenery, width: phone ? pose.scenery.phone : pose.scenery.width } : null;
  const groupWidth = width + (scenery ? scenery.width - OVERLAP : 0);
  const start = sceneWidth === null ? 0.75 : (sceneWidth - groupWidth) / 2;
  const behind = scenery?.side === "back";
  const dogLeft = start + (behind && scenery ? scenery.width - OVERLAP : 0);

  return {
    width,
    height: heightOf({ name: pose.name, width }),
    dogLeft,
    headX: dogLeft + pose.head * width,
    scenery: scenery && { ...scenery, left: behind ? start : dogLeft + width - OVERLAP },
  };
}

/*===== Guide Panel =====*/
/**
 * The center's dog, who takes the request to the center's trainer. His pose and line follow the form (`GUIDE`): the pose
 * swaps with a keyed `answer-in`, the bubble pops again with each new line. On load he rises from behind the path's edge
 * and his bubble pops at 0.4s (the page's load moment, `page-motion.tsx`). After the first change he just swaps.
 *
 * - `desk`: the sticky end column's stage, a grained panel with a night sky, the dimmed centre far back, a path, a
 *   bush either side and a pool of warm light; under the stage, «بعدش چی می‌شه؟» as three short lines (`nextSteps`),
 *   so the column carries information, not only art. Drawn on a unit (`--u`, at most 1rem) that shrinks with the
 *   column, so the whole scene fits a narrow laptop column.
 * - `phone`: a compact band over the form, the dog on a short path at the end (left) side and his bubble at the start
 *   side above him.
 *
 * The stage is decoration (`aria-hidden`): the page's live region says his line once per change, and the form's plates
 * say the same things in plain text. Physical sides throughout: the pieces are tied to the pictures (every pose faces
 * right) and the bubble's tail is aimed at his head.
 */
export function GuidePanel({
  mood,
  variant,
  nextSteps = false,
  className,
}: {
  mood: GuideMood;
  variant: "desk" | "phone";
  nextSteps?: boolean;
  className?: string;
}) {
  const changed = useChanged(mood);

  if (variant === "phone") {
    return (
      <div
        aria-hidden
        className={cn(
          "relative h-[12rem] overflow-hidden rounded-4xl border border-border/60 bg-sunken paper-grain shadow-[0_24px_48px_-28px_rgb(0_0_0/0.9)]",
          className,
        )}
      >
        <Scene mood={mood} phone changed={changed} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-4xl border border-border/60 bg-sunken paper-grain shadow-[0_24px_48px_-28px_rgb(0_0_0/0.9)]",
        className,
      )}
    >
      {/*===== Stage =====*/}
      <div
        aria-hidden
        className="[container-type:inline-size] relative h-[calc(25*var(--u))] [--u:min(100cqw/27,1rem)]"
      >
        <Scene mood={mood} phone={false} changed={changed} />
      </div>

      {/*===== What Happens Next =====*/}
      {nextSteps && (
        <section aria-labelledby="guide-next-title" className="border-t border-foreground/10 px-6 pt-6 pb-7 xl:px-8">
          <h2 id="guide-next-title" className={cn(DISPLAY_HEADING, "text-xl")}>
            {m.assessment_next_title()}
          </h2>
          <ol className="mt-4 flex flex-col gap-3.5">
            {nextStepsFor().map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground"
                >
                  {formatNumber(index + 1)}
                </span>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{step.line}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/*===== Scene =====*/
/**
 * The picture itself. Desktop sizes are multiples of `--u` (a 27-unit wide scene, centred, on a path 1.6 units high);
 * the phone band's are rem, the group at its left end.
 */
function Scene({ mood, phone, changed }: { mood: GuideMood; phone: boolean; changed: boolean }) {
  const { pose, line } = guideFor(mood);
  const place = layout({ pose, phone, sceneWidth: phone ? null : 27 });
  // One unit: rem on the phone, the stage's own unit on the desktop.
  const u = (value: number) => (phone ? `${value}rem` : `calc(${value} * var(--u))`);

  return (
    <>
      {/* A pool of warm light where he stands. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 40% 55% at calc(${u(place.dogLeft + place.width / 2)}${phone ? "" : " + (100% - 27 * var(--u)) / 2"}) 88%, rgb(255 194 26 / 0.08), transparent)`,
        }}
      />

      {/*------ Sky ------*/}
      {!phone && <NightSky className="inset-x-[8%] top-4 h-[calc(7*var(--u))]" />}

      {/*------ Path ------*/}
      <GroundStrip
        className={cn(
          "absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
          phone ? "h-7" : "h-[calc(2.4*var(--u))]",
        )}
      />

      {/*------ Pieces ------*/}
      <div
        className={cn(
          "absolute bottom-0 h-full",
          phone ? "inset-x-0" : "start-1/2 w-[calc(27*var(--u))] translate-x-1/2 ltr:-translate-x-1/2",
        )}
        style={{ bottom: phone ? "0.95rem" : "calc(1.3 * var(--u))" }}
      >
        {/* The centre where the evaluation happens, far back at the right, so his head and bubble stay clear. */}
        <div
          className="absolute opacity-55"
          style={{ right: u(0.25), bottom: u(phone ? 0.9 : 1.8), width: u(phone ? 9.5 : 13) }}
        >
          <MascotCut name="center" className="block w-full" />
        </div>
        <Bush side="left" phone={phone} u={u} />
        <Bush side="right" phone={phone} u={u} />

        {/*------ Scenery Beside Him ------*/}
        {place.scenery && (
          <div
            key={place.scenery.name}
            className={cn("absolute bottom-0 translate-y-[5%]", changed && "answer-in")}
            style={{ left: u(place.scenery.left), width: u(place.scenery.width) }}
          >
            <MascotCut name={place.scenery.name} className="block w-full" />
          </div>
        )}

        {/*------ The Dog ------*/}
        {/* The rise (or the swap) on the wrapper, the idle breath on the picture, so one doesn't cancel the other. */}
        <div
          key={pose.name}
          className={cn("absolute bottom-0 translate-y-[3%]", changed ? "answer-in" : "as-rise")}
          style={{ left: u(place.dogLeft), width: u(place.width) }}
        >
          <MascotCut name={pose.name} eager={!changed} className="lively-breathe block w-full" />
        </div>
      </div>

      {/*------ Bubble ------*/}
      {/* Desktop: over his head, its tail (2.25rem in from its right edge) on his head. Phone: top-anchored just past
          his head towards the band's start side, its tail (on the left) pointing down at his face. The float is on the
          wrapper, the pop on the bubble, so a new line pops while the float goes on. */}
      {phone ? (
        <div className="lively-float absolute top-3 right-3" style={{ left: `calc(${place.headX}rem + 0.25rem)` }}>
          <ChalkBubble
            key={line}
            tail="left"
            className={cn(
              "answer-pop ms-auto text-pretty [--pop-origin:1.75rem_100%]",
              !changed && "[--answer-delay:0.4s]",
            )}
          >
            {line}
          </ChalkBubble>
        </div>
      ) : (
        <div
          className="lively-float absolute start-1/2 translate-x-1/2 ltr:-translate-x-1/2"
          style={{ bottom: `calc(${place.height + 1.3} * var(--u) + 0.6rem)`, width: "calc(27 * var(--u))" }}
        >
          <div
            className="absolute bottom-0 -translate-x-full"
            style={{
              left: `calc(${place.headX} * var(--u) + 2.25rem)`,
              width: "max-content",
              maxWidth: `min(16rem, calc(${place.headX} * var(--u) + 1.75rem))`,
            }}
          >
            <ChalkBubble
              key={line}
              tail="right"
              className={cn(
                "answer-pop text-pretty [--pop-origin:calc(100%-2.25rem)_100%]",
                !changed && "[--answer-delay:0.4s]",
              )}
            >
              {line}
            </ChalkBubble>
          </div>
        </div>
      )}
    </>
  );
}

/*===== Bush =====*/
/** A bush at each end of the path, the left one smaller and mirrored, swaying out of step. */
function Bush({ side, phone, u }: { side: "left" | "right"; phone: boolean; u: (value: number) => string }) {
  const left = side === "left";
  return (
    <div
      className="absolute bottom-0 translate-y-[6%]"
      style={{
        [side]: u(phone ? -0.6 : -0.9),
        width: u(left ? (phone ? 2.6 : 4) : phone ? 3.2 : 4.8),
      }}
    >
      <MascotCut name="plants" className={cn("block w-full", left ? "lively-sway-2 -scale-x-100" : "lively-sway")} />
    </div>
  );
}
