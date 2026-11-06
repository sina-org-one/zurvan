import { cn } from "cn";
import { CheckIcon, HourglassIcon } from "lucide-react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { MascotCut } from "~/components/mascot-cut";
import { BRICK } from "~/lib/brick";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatNumber } from "~/lib/locale-format";
import type { Dog } from "~/orpc/dog/contract";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/account_dog_detail/column";
import { useInView } from "~/routes/account_dog_detail/components/use-in-view";

/*===== Ribbons =====*/
// The three ribbon colours of the medals the mascot wears (red, blue, green), a little muted so the gold leads.
const RIBBONS = [
  { light: "#c2493f", dark: "#963229" },
  { light: "#3f6cc0", dark: "#2c4f94" },
  { light: "#3f9a5c", dark: "#2b7444" },
] as const;

/*===== Medals Band =====*/
/**
 * «مدال‌های {name}»: the page's one brick band, full-bleed, running into the footer. The courses the dog has passed
 * (F2) hang on the wall as gold medals on ribbons from a rail, each with a dark label plate under it (the title, and
 * «ما ثبت کردیم» for a course the Admin marked by hand: the customer never saw it being bought). After them hang
 * the courses it is training in now, as dashed outline medals with «در راه» on their plates: the rail shows what is
 * won and what is on its way, not a row of blanks. Only a dog with neither gets the empty hooks.
 *
 * Every medal carries its own piece of rail, so a row that wraps (two medals a row on phones) hangs from a rail too.
 *
 * On the coping at the start side the `medals` dog sits proud beside the dimmed trophy shelf, saying his buddy earned
 * these. No medal yet: the `trophy` dog lies by the empty podium (no bubble: nothing is promised).
 *
 * Motion: the gold medals swing once on their ribbons when the band comes into view (`dd-swung`), then sway a little,
 * each out of step with the next; the dashed ones only sway (nothing was won, so nothing swings in). The bubble pops
 * on the way down. Off for reduced motion.
 */
export function MedalsBand({
  dogName,
  courses,
  active,
}: {
  dogName: string;
  courses: Dog["passedCourses"];
  /** The courses the dog is training in now (its active enrollments). */
  active: { slug: string; title: string }[];
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  // A course the Admin marked passed by hand while it was still running shows once, as won.
  const coming = active.filter((course) => !courses.some((passed) => passed.slug === course.slug));
  const empty = courses.length === 0;
  const bare = empty && coming.length === 0;

  return (
    <section
      aria-labelledby="medals-title"
      style={{ backgroundImage: `var(--grain), ${BRICK}` }}
      className={cn(
        "relative border-t-2 border-t-foreground/60 surface-inverse pt-section-sm pb-section-sm",
        // Room above the wall for what sits on it: the medals dog and his bubble stand taller than the lying one.
        empty ? "mt-44 md:mt-48" : "mt-56 md:mt-60",
      )}
    >
      {/*===== On the Coping =====*/}
      {/* He sits at the start side, over the end of the main column, where the page leaves the most room above the
          wall whatever the column heights. He is mirrored to face the middle of the page (every cut-out faces right),
          so his shelf or podium stands on his outer side and his bubble opens towards the middle: physical sides on
          purpose, tied to the picture. */}
      <div aria-hidden className={`${COLUMN} pointer-events-none absolute inset-x-0 bottom-full`}>
        {empty ? (
          <div className="relative ms-[30%] w-40 translate-y-[3%] sm:ms-[36%] md:w-48 lg:ms-[40%]">
            <div className="absolute -inset-x-1/3 -top-1/2 bottom-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_70%,rgb(255_194_26/0.08),transparent)]" />
            <MascotCut name="podium" className="absolute bottom-0 left-[84%] w-[80%]" />
            <MascotCut name="plants" className="lively-sway-2 absolute right-[94%] bottom-0 w-[24%] -scale-x-100" />
            <div className="dd-rise relative">
              <MascotCut name="trophy" className="lively-breathe block w-full -scale-x-100" />
            </div>
          </div>
        ) : (
          <div className="relative ms-[34%] w-24 translate-y-[3%] sm:ms-[36%] md:w-28 lg:ms-[46%]">
            <div className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_65%,rgb(255_194_26/0.08),transparent)]" />
            <MascotCut name="trophy-shelf" className="absolute bottom-0 left-[86%] w-[120%] sm:w-[150%] md:w-[160%]" />
            <MascotCut name="plants" className="lively-sway absolute right-[70%] bottom-0 w-[48%] -scale-x-100" />
            <div className="dd-rise relative">
              <MascotCut name="medals" className="lively-breathe block w-full -scale-x-100" />
            </div>
            <ChalkBubble
              tail="right"
              className="lively-reveal-pop absolute right-[44%] bottom-[94%] max-w-[12rem] text-pretty md:max-w-[14rem]"
            >
              {m.account_dog_detail_medals_bubble({ dogName })}
            </ChalkBubble>
          </div>
        )}
      </div>

      <div className={COLUMN}>
        {/*===== Heading =====*/}
        <h2 id="medals-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
          {m.account_dog_detail_medals_title({ dogName })}
        </h2>
        <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
          {describeRail({ passed: courses.length, coming: coming.length })}
        </p>

        {/*===== The Rail =====*/}
        <div ref={ref} className={cn("relative mt-10", inView && "dd-swung")}>
          {bare ? (
            <>
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1.5 rounded-full bg-foreground/25 shadow-[0_3px_6px_rgb(0_0_0/0.45)]"
              />
              <ul aria-hidden className="flex gap-10 ps-6 sm:gap-14">
                {[0, 1, 2].map((hook) => (
                  <li key={hook} className="flex flex-col items-center">
                    <span className="relative z-10 size-3 rounded-full bg-foreground/40" />
                    <span className="mt-6 size-14 rounded-full border-2 border-dashed border-foreground/25" />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul
              aria-label={m.account_dog_detail_medals_list({ dogName })}
              className="flex flex-wrap gap-x-4 gap-y-10 sm:gap-x-8 lg:gap-x-10"
            >
              {courses.map((course, index) => (
                <Medal key={course.slug} course={course} index={index} />
              ))}
              {coming.map((course, index) => (
                <ComingMedal key={course.slug} title={course.title} index={courses.length + index} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/*===== Rail Line =====*/
/** The line under the heading: what is won and what is on its way, in that order. */
function describeRail({ passed, coming }: { passed: number; coming: number }): string {
  if (passed === 0 && coming === 0) return m.account_dog_detail_rail_none();
  if (passed === 0) return m.account_dog_detail_rail_coming();
  // The plural follows the passed count (Persian has one form, so both of its messages read the same).
  const counts = { passed: formatNumber(passed), coming: formatNumber(coming) };
  if (coming === 0)
    return passed === 1 ? m.account_dog_detail_rail_won_one(counts) : m.account_dog_detail_rail_won_other(counts);
  return passed === 1
    ? m.account_dog_detail_rail_won_coming_one(counts)
    : m.account_dog_detail_rail_won_coming_other(counts);
}

/*===== Rail Piece =====*/
// Each medal's own stretch of rail, reaching half the gap on either side, so the pieces of a row meet into one rail
// and a wrapped row hangs from its own.
const RAIL_PIECE =
  "pointer-events-none absolute -inset-x-2 top-0 h-1.5 bg-foreground/25 shadow-[0_3px_6px_rgb(0_0_0/0.45)] sm:-inset-x-4 lg:-inset-x-5";

/*===== Item Width =====*/
// Two a row on phones, a fixed width from `sm` so titles wrap the same way in every row.
const ITEM = "relative flex w-[calc(50%-0.5rem)] flex-col items-center sm:w-40";

/*===== Medal =====*/
/** One passed course: a nail on the rail, a ribbon, the gold disc with a check, and its label plate. */
function Medal({ course, index }: { course: Dog["passedCourses"][number]; index: number }) {
  const ribbon = RIBBONS[index % RIBBONS.length];

  return (
    <li className={ITEM}>
      <span aria-hidden className={RAIL_PIECE} />
      <div
        style={{ "--dd-delay": `${Math.min(index, 5) * 0.12}s` } as React.CSSProperties}
        className="dd-medal flex origin-top flex-col items-center"
      >
        {/* The idle sway on an inner box, so the one-off swing above composes with it. */}
        <div style={{ animationDelay: `${-index * 1.3}s` }} className="dd-sway flex origin-top flex-col items-center">
          <span aria-hidden className="relative z-10 size-3 rounded-full bg-foreground/60 shadow-sm" />
          <svg aria-hidden viewBox="0 0 48 56" className="-mt-1.5 block h-14 w-12">
            <polygon points="6,0 19,0 31,52 21,56" fill={ribbon.dark} />
            <polygon points="29,0 42,0 27,56 17,52" fill={ribbon.light} />
          </svg>
          <span
            aria-hidden
            className="-mt-2 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_18px_-8px_rgb(0_0_0/0.8)] ring-4 ring-[#d9a100]"
          >
            <span className="flex size-11 items-center justify-center rounded-full border-2 border-primary-foreground/25">
              <CheckIcon strokeWidth={3.2} className="size-6" />
            </span>
          </span>
        </div>
      </div>

      {/*------ Label ------*/}
      <div className="mt-4 w-full rounded-2xl border border-border/50 bg-jet paper-grain px-3 py-2.5 text-center shadow-[0_12px_24px_-14px_rgb(0_0_0/0.9)]">
        <p className="text-sm font-extrabold text-pretty">{course.title}</p>
        {course.source === "admin" && (
          <p className="mt-0.5 text-xs text-muted-foreground">{m.account_dog_detail_medal_by_admin()}</p>
        )}
      </div>
    </li>
  );
}

/*===== Coming Medal =====*/
/**
 * A course the dog is training in now: the same nail and ribbon drawn as a dashed outline, an empty dashed disc, and
 * its plate with «در راه». Muted, no gold: nothing is won yet. It sways with the others but never swings in.
 */
function ComingMedal({ title, index }: { title: string; index: number }) {
  return (
    <li className={ITEM}>
      <span aria-hidden className={RAIL_PIECE} />
      <div style={{ animationDelay: `${-index * 1.3}s` }} className="dd-sway flex origin-top flex-col items-center">
        <span aria-hidden className="relative z-10 size-3 rounded-full bg-foreground/45 shadow-sm" />
        <svg aria-hidden viewBox="0 0 48 56" className="-mt-1.5 block h-14 w-12 text-foreground/35">
          <polygon
            points="6,0 19,0 31,52 21,56"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="3 3"
          />
          <polygon
            points="29,0 42,0 27,56 17,52"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="3 3"
          />
        </svg>
        <span
          aria-hidden
          className="-mt-2 flex size-16 items-center justify-center rounded-full border-2 border-dashed border-foreground/40 bg-jet/40"
        >
          <HourglassIcon strokeWidth={1.8} className="size-6 text-foreground/45" />
        </span>
      </div>

      {/*------ Label ------*/}
      <div className="mt-4 w-full rounded-2xl border border-dashed border-foreground/20 bg-jet/70 paper-grain px-3 py-2.5 text-center">
        <p className="text-sm font-extrabold text-pretty text-foreground/85">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{m.account_dog_detail_medal_coming()}</p>
      </div>
    </li>
  );
}
