import { cn } from "cn";
import { ArrowLeft } from "lucide-react";

import { GroundStrip } from "~/components/ground-strip";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { isCatalogueFamily } from "~/lib/catalogue-search-params";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import type { CourseMascotPose } from "~/lib/course-mascot";
import type { CourseFamily } from "~/orpc/course/constants";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/about/column";

/*===== Types =====*/
/** One family of the lineup: what the page passes (a family with at least one course, its tab label and its pose). */
export type LineupFamily = { family: CourseFamily; label: string; pose: CourseMascotPose };

// Each dog's own idle loop, in turn, so a row of them never moves in step.
const IDLE = [
  "lively-breathe",
  "lively-wiggle",
  "lively-twitch",
  "lively-wiggle-late",
  "lively-tilt",
  "lively-breathe",
];

const FOCUS = "outline-none focus-visible:ring-3 focus-visible:ring-ring/60";

/*===== Lineup =====*/
/**
 * «What I learn at Zurvan»: the families that have courses, one dog each, standing on one long path, with the family's
 * name under him. Each dog is a link to the catalogue filtered to his family; a signpost at the path's end links to
 * all of them.
 *
 * One list serves both layouts. From `lg` the items sit on one continuous path (a single strip behind the row). On
 * phones every item is its own small stage in a two-column grid, and the number of families decides what the last cell
 * does so the grid never has a hole: families plus the «all courses» cell make an even count, or, when they don't, the
 * signpost cell takes the whole last row.
 */
export function AboutLineup({ families }: { families: LineupFamily[] }) {
  const lastCellSpans = (families.length + 1) % 2 === 1;

  return (
    <section aria-labelledby="about-lineup-title" className={`${COLUMN} pt-section-md`}>
      <h2 id="about-lineup-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
        {m.about_lineup_title()}
      </h2>

      <div className="relative mt-8 lg:mt-14">
        {/*------ The path (desktop) ------*/}
        {/* The dogs' boxes are 10rem tall and their feet rest 0.5rem inside the strip, which is 3rem tall. */}
        <GroundStrip className="absolute inset-x-0 top-[calc(10rem-2.5rem)] z-0 hidden h-12 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] md:h-12 lg:block" />

        <ul
          style={{ "--n": families.length } as React.CSSProperties}
          className="relative z-10 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))_9rem] lg:gap-3"
        >
          {families.map(({ family, label, pose }, index) => (
            <li key={family}>
              <Link
                to="/courses"
                // Every lineup family is a catalogue family (`familiesWithCourses`); the check only narrows the type.
                search={{ family: isCatalogueFamily(family) ? family : undefined }}
                className={cn(
                  FOCUS,
                  "ab-lift lively-lift group flex h-full flex-col items-center rounded-3xl max-lg:border max-lg:border-border max-lg:bg-card max-lg:paper-grain",
                )}
              >
                <span aria-hidden className="relative flex h-36 w-full items-end justify-center lg:h-40">
                  <span className="absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_50%_85%,rgb(255_194_26/0.08),transparent)]" />
                  <GroundStrip className="absolute inset-x-0 bottom-0 h-9 md:h-9 lg:hidden" />
                  <MascotCut
                    name={pose}
                    className={cn(
                      "lively-lift-pic relative mb-3 h-28 w-auto lg:mb-2 lg:h-36",
                      IDLE[index % IDLE.length],
                    )}
                  />
                </span>
                <span className="px-2 pt-2 pb-3 text-center font-bold lg:pt-5 lg:pb-0">{label}</span>
              </Link>
            </li>
          ))}

          {/*------ All courses ------*/}
          <li className={cn(lastCellSpans && "col-span-2 lg:col-span-1")}>
            <Link
              to="/courses"
              className={cn(
                FOCUS,
                "flex h-full items-center rounded-3xl max-lg:border max-lg:border-border max-lg:bg-card max-lg:paper-grain",
                lastCellSpans ? "justify-center gap-5 max-lg:p-4 lg:flex-col lg:justify-start" : "flex-col",
              )}
            >
              <span aria-hidden className="relative flex h-28 items-end justify-center lg:h-40">
                <MascotCut name="signpost" className="relative mb-2 h-24 w-auto lg:h-32" />
              </span>
              <span className="flex items-center gap-1.5 px-2 pt-2 pb-3 font-bold text-primary lg:pt-5 lg:pb-0">
                {m.about_lineup_all()}
                <ArrowLeft aria-hidden className="size-4 ltr:-scale-x-100" />
              </span>
            </Link>
          </li>
        </ul>
      </div>

      {/* The shared lift answers hover only; a keyboard focus lifts the dog the same way. Off for reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ab-lift:focus-visible { transform: translateY(-6px) rotate(-.6deg); }
          .ab-lift:focus-visible .lively-lift-pic { animation: lively-jelly .7s ease-in-out; }
        }
      `}</style>
    </section>
  );
}
