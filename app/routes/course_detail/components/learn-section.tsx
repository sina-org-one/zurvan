import { BedDoubleIcon } from "lucide-react";

import { BoardingCostNote } from "~/components/boarding-cost-note";
import { GroundStrip } from "~/components/ground-strip";
import { MascotCut } from "~/components/mascot-cut";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";
import { COURSE_PLACE_LABELS } from "~/orpc/course/constants";
import type { Course } from "~/orpc/course/contract";
import { ChalkCheck } from "~/routes/course_detail/components/chalk-check";

/*===== Learn Section =====*/
/**
 * What the course teaches, in the dog's voice: the owner's own card as a flat two-column list, one line about where the
 * training happens (the customer picks the place in the cart), and boarding when the course offers it, with its cost
 * left to the center's call (F5).
 *
 * Working and sport courses have no ages, sessions or commands yet, only branches, so they get pills and a note
 * instead of a list of commands: ticking a branch would promise a program that is decided after the evaluation.
 *
 * The heading is his line, so he is here to say it: he peeks over the plate's top edge at its end corner, his chin on
 * the edge and his paws over it (the catalogue's wall, in small), and climbs up as the plate scrolls into view.
 *
 * Returns just its own section: the page owns the container, the 7/5 grid beside the lane rail and the spacing.
 */
export function LearnSection({ course }: { course: Course }) {
  const isBranches = course.minAgeMonths === null;

  return (
    <section aria-labelledby="learn-title">
      {/*------ Heading ------*/}
      <h2 id="learn-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
        {isBranches ? m.course_detail_learn_title_branches() : m.course_detail_learn_title()}
      </h2>

      {/*------ Words ------*/}
      {/* The end padding keeps the line clear of the dog's head. */}
      <div className="mt-4 flex max-w-[38rem] flex-col gap-3 pe-32 text-pretty text-muted-foreground sm:pe-40">
        <p>{isBranches ? branchesLine() : placeLine(course)}</p>
      </div>

      {/*------ List ------*/}
      <div className="relative mt-6">
        <PeekingDog />
        {isBranches ? <BranchPills branches={course.commands} /> : <CommandList commands={course.commands} />}
      </div>

      {/*------ Boarding ------*/}
      {!isBranches && course.places.includes("boarding") && <Boarding />}
    </section>
  );
}

/*===== Plate =====*/
// The home page's teach board: a grained plate on the page's own paper, edged with a faint ink line.
const PLATE = "paper-grain rounded-3xl border-2 border-foreground/10 bg-background";

/*===== Peeking Dog =====*/
/**
 * The `peek` cut-out ends in a flat cut under his chin (89% down) with his paws below it, so the box ends on the
 * plate's top edge and is sunk by the paws' length: the chin rests on the edge, the paws hang over the plate. A bush
 * behind him on the start side. He rises from behind the edge as it scrolls into view (the clip moves with him, so
 * nothing shows below the edge until he is up), then breathes. Off for reduced motion, and where scroll-driven
 * animation isn't supported he is simply there.
 */
function PeekingDog() {
  return (
    <div aria-hidden className="absolute end-4 bottom-full z-10 w-24 translate-y-[11%] sm:end-8 sm:w-28">
      <MascotCut name="plants" className="lively-sway absolute start-[62%] bottom-[12%] w-[44%] -scale-x-100" />
      <div className="cd-peek relative">
        <MascotCut name="peek" className="lively-breathe block w-full" />
      </div>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @supports (animation-timeline: view()) {
            .cd-peek {
              animation: cd-peek linear both;
              animation-timeline: view();
              animation-range: entry 40% cover 45%;
            }
          }
        }
        @keyframes cd-peek {
          0% { transform: translateY(90%); clip-path: inset(-30% -30% 101% -30%); }
          80% { transform: translateY(-3%); clip-path: inset(-30% -30% 8% -30%); }
          90% { transform: none; clip-path: inset(-30% -30% 11% -30%); }
          100% { transform: none; clip-path: inset(-30% -30% -10% -30%); }
        }
      `}</style>
    </div>
  );
}

/*===== Command List =====*/
/**
 * The owner's card written on the plate, in two columns that read top to bottom (CSS columns, not a grid, so a line
 * never reads across). Every row carries a bottom hairline; the list is pulled down one pixel inside the clipped plate
 * so the last row of the longest column doesn't sit on a stray line.
 */
function CommandList({ commands }: { commands: string[] }) {
  return (
    <div className={`overflow-hidden ${PLATE}`}>
      <ul className="-mb-px px-6 sm:columns-2 sm:gap-x-10 sm:px-8">
        {commands.map((command) => (
          <li key={command} className="flex break-inside-avoid items-start gap-3 border-b border-foreground/15 py-3.5">
            <ChalkCheck className="mt-1 size-5 shrink-0" />
            <span className="text-pretty">{command}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/*===== Branch Pills =====*/
function BranchPills({ branches }: { branches: string[] }) {
  return (
    <div className={`p-6 sm:p-8 ${PLATE}`}>
      <ul className="flex flex-wrap gap-2.5">
        {branches.map((branch) => (
          <li key={branch} className="rounded-full border-2 border-foreground/30 px-4 py-1.5 font-bold">
            <bdi>{branch}</bdi>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-foreground/15 pt-5 text-sm text-pretty text-muted-foreground">
        {m.course_detail_learn_branches_note()}
      </p>
    </div>
  );
}

/*===== Boarding =====*/
/**
 * Boarding is one of the places a customer can pick in the cart. It costs extra, and that is never charged on the site:
 * the center calls to arrange it and agree on the price, so the card says that instead of a number.
 */
function Boarding() {
  return (
    // The partner pension's lodge stands at the card's end side on a short path; phones put it under the words.
    <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-sunken paper-grain p-5 max-sm:pb-36 sm:p-6 sm:pe-56">
      <div aria-hidden className="absolute end-0 bottom-0 w-52 sm:w-56">
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgb(255_194_26/0.08),transparent)]" />
        <MascotCut name="lodge" className="absolute end-4 bottom-4 w-[78%] scenery-dim" />
        <GroundStrip className="h-7 [mask-image:linear-gradient(to_right,transparent,black_30%,black_85%,transparent)] md:h-8" />
      </div>

      <div className="relative flex items-start gap-4">
        <BedDoubleIcon aria-hidden strokeWidth={1.5} className="mt-0.5 size-8 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-extrabold">{m.course_detail_learn_boarding_title()}</p>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">{m.course_detail_learn_boarding_text()}</p>
          <BoardingCostNote className="mt-3 w-fit" />
        </div>
      </div>
    </div>
  );
}

/*===== Copy =====*/
/** One line on where the lessons happen: picked in the cart, or told after the evaluation when the course names none. */
function placeLine({ places }: Course): string {
  if (places.length === 0) return m.course_detail_learn_place_later();
  const [only] = places;
  if (places.length === 1 && only) {
    return m.course_detail_learn_place_one({ place: COURSE_PLACE_LABELS[only] });
  }
  return m.course_detail_learn_place_pick();
}

function branchesLine(): string {
  return m.course_detail_learn_branches_line();
}
