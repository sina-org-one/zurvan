import { cn } from "cn";
import { CheckIcon } from "lucide-react";

import { m } from "~/paraglide/messages";

/*===== Stops =====*/
// The road a dog walks to its courses, as the help page tells it: introduced, the request, the center's call,
// the courses open. Short labels, so all four fit one row on a phone. A function: the labels are messages and must be
// read while rendering.
function stops(): readonly string[] {
  return [
    m.assessment_road_intro(),
    m.assessment_road_request(),
    m.assessment_road_call(),
    m.assessment_road_courses(),
  ];
}

/** Where the customer is on the road: 0 introduce a dog, 1 the request, 2 the call, 3 the courses. */
export type RoadStep = 0 | 1 | 2 | 3;

/*===== Header Road =====*/
/**
 * Four stops on one chalk line under the page's heading, in one row on every screen: the stops reached are filled gold
 * discs with a check, the current one a gold ring whose halo breathes (its label gold), the ones ahead faint. The line
 * is gold as far as the current stop.
 *
 * Each segment is drawn inside the stop it leaves, from its disc's centre (`start-1/2`) the item's full width to the
 * next disc's centre. `walkedFrom` is the step the road stood on before a change on this page (the request sent): the
 * newly walked segment draws itself and the discs that changed turn, keyed by their look so they replay.
 */
export function HeaderRoad({ step, walkedFrom }: { step: RoadStep; walkedFrom: RoadStep | null }) {
  const labels = stops();

  return (
    <ol aria-label={m.assessment_road_label()} className="grid max-w-xl grid-cols-4">
      {labels.map((label, index) => {
        const tone = index < step ? "done" : index === step ? "current" : "ahead";
        const walked = index < step;
        // Changed since the page opened: the segment and discs between the old step and the new one.
        const fresh = walkedFrom !== null && index >= walkedFrom && index <= step;

        return (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className="relative flex flex-col items-center gap-2 px-1 text-center"
          >
            {/*------ Segment ------*/}
            {/* A plain dashed chalk line: at this size the chalk-filtered pattern breaks up into scribbles. */}
            {index < labels.length - 1 && (
              <span
                key={`seg-${walked}`}
                aria-hidden
                className={cn(
                  "absolute start-1/2 top-[calc(1rem-1px)] h-0.5 w-full rounded-full",
                  "bg-[repeating-linear-gradient(to_left,currentColor_0_7px,transparent_7px_13px)]",
                  walked ? "text-primary/85" : "text-foreground/35",
                  walked && fresh && "as-draw",
                )}
              />
            )}

            {/*------ Disc ------*/}
            <span
              key={tone}
              className={cn("relative z-10", fresh && "as-fill")}
              // The stop just left turns first, then the new lit one, after the line has reached it.
              style={fresh ? ({ "--as-delay": index === step ? "0.6s" : "0.1s" } as React.CSSProperties) : undefined}
            >
              <Disc tone={tone} />
            </span>

            {/*------ Label ------*/}
            <span
              className={cn(
                "text-[11px] leading-snug font-bold text-balance sm:text-xs",
                tone === "current" ? "text-primary" : tone === "done" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/*===== Disc =====*/
/**
 * A stop's disc: reached, a filled gold disc with a check; lit, a hand-drawn gold chalk ring on the paper (so it hides
 * the line passing under it) with a halo that breathes; ahead, the same ring in faint ink.
 */
function Disc({ tone }: { tone: "done" | "current" | "ahead" }) {
  if (tone === "done") {
    return (
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
        <CheckIcon strokeWidth={3} className="size-4" />
      </span>
    );
  }

  return (
    <span aria-hidden className="relative grid size-8 place-items-center rounded-full bg-background">
      {tone === "current" && <span className="as-halo absolute inset-0 rounded-full border-2 border-primary/50" />}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={cn("absolute inset-0", tone === "current" ? "text-primary" : "text-foreground/40")}
      >
        <path
          d="M33 4C49 4 60 16 60 32S48 60 32 60 4 47 4 32 16 4 29 5.5"
          stroke="currentColor"
          strokeWidth={3.6}
          strokeLinecap="round"
          filter="url(#as-chalk)"
        />
      </svg>
      {tone === "current" && <span className="relative size-2.5 rounded-full bg-primary" />}
    </span>
  );
}
