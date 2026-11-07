import { cn } from "cn";

import { GroundStrip } from "~/components/ground-strip";
import { MascotCut } from "~/components/mascot-cut";
import { CENTER } from "~/lib/contact";
import { ZURVAN_SINCE } from "~/lib/head-trainer";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/about/column";

/*===== Scenes =====*/
// Each fact has a small stage: a dog on a path in front of a piece of the place the fact is about. Pieces are placed as
// shares of the box, so one composition fits both the phone's slim square (8.5rem) and the desktop stage (about 18rem
// wide, 11rem tall). The ground strip is the stage's floor; the dogs' feet are a little inside it.
const FLOOR =
  "absolute inset-x-0 bottom-0 h-8 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] md:h-10";
const POOL =
  "absolute inset-x-0 bottom-0 h-full bg-[radial-gradient(ellipse_55%_60%_at_45%_85%,rgb(255_194_26/0.08),transparent)]";

/** The center's years of work: the dog sits by his notebook in front of the training centre. */
function ExperienceScene() {
  return (
    <>
      <div className={POOL} />
      <MascotCut name="center" className="absolute end-[-4%] bottom-[18%] w-[80%]" />
      <GroundStrip className={FLOOR} />
      <MascotCut name="teach-advice" className="lively-breathe absolute start-[2%] bottom-[7%] w-[66%]" />
    </>
  );
}

/** Private training at your place: the dog waits on his leash in front of a house. */
function PlacesScene() {
  return (
    <>
      <div className={POOL} />
      <MascotCut name="home" className="absolute end-[-4%] bottom-[18%] w-[80%]" />
      <GroundStrip className={FLOOR} />
      <MascotCut name="leash" className="lively-wiggle absolute start-[10%] bottom-[7%] h-[92%] w-auto" />
    </>
  );
}

/** All over Tehran: the dog trots along with his leash, the skyline and the Alborz behind him. */
function AreaScene() {
  return (
    <>
      <div className={POOL} />
      {/* Cropped to the Milad tower's side (the picture's right) so the tower and the peaks read at this size, with
          its hard straight sides faded out. The dog stands on the other side of the stage. */}
      <div className="absolute inset-x-0 bottom-[13%] h-[75%] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
        <MascotCut name="tehran" className="absolute right-0 bottom-0 w-[190%]" />
      </div>
      <GroundStrip className={FLOOR} />
      <MascotCut name="course-companion" className="lively-hop absolute end-[8%] bottom-[7%] h-[88%] w-auto" />
    </>
  );
}

/*===== Stage =====*/
/**
 * One fact. Phones lay it out as a slim row (the scene at the start, the words beside it); from `lg` the three stand
 * side by side with the words on top and the scene at the bottom, so extra height only adds sky.
 */
function Stage({
  scene,
  children,
  className,
}: {
  scene: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "lively-reveal grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-x-4 p-3 lg:flex lg:min-h-[23rem] lg:flex-col lg:items-stretch lg:p-8",
        className,
      )}
    >
      <div className="lg:flex-1">{children}</div>
      <div aria-hidden className="relative h-32 max-lg:order-first lg:mt-6 lg:h-56">
        {scene}
      </div>
    </li>
  );
}

/*===== Facts =====*/
/**
 * Three facts about the center, each on its own stage: its years (`ZURVAN_SINCE`), the private formats (at your place
 * or at the center, as the home page says) and the service area (`contact.ts`). No bubbles here: the facts are the
 * words. The head trainer's credential moved to her card in the trainers section (2026-11-06): it is hers, not the
 * center's.
 */
export function AboutFacts() {
  return (
    <section aria-labelledby="about-facts-title" className={`${COLUMN} pt-section-sm`}>
      <h2 id="about-facts-title" className="sr-only">
        {m.about_facts_title()}
      </h2>
      <div className="overflow-hidden rounded-4xl border border-border bg-sunken paper-grain shadow-sm">
        <ul className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {/*------ Experience ------*/}
          <Stage scene={<ExperienceScene />}>
            <p className="font-display text-3xl leading-tight font-extrabold text-primary lg:text-5xl">
              {m.about_facts_since({ year: ZURVAN_SINCE.sinceYear })}
            </p>
            <p className="mt-2 text-pretty text-muted-foreground">
              {m.about_facts_experience({ years: formatNumber(ZURVAN_SINCE.years) })}
            </p>
          </Stage>

          {/*------ Places ------*/}
          <Stage scene={<PlacesScene />}>
            <p className="font-display text-2xl leading-snug font-extrabold text-balance text-primary lg:text-3xl">
              {m.about_facts_places()}
            </p>
          </Stage>

          {/*------ Area ------*/}
          <Stage scene={<AreaScene />}>
            <p className="font-display text-2xl leading-snug font-extrabold text-balance text-primary lg:text-3xl">
              {m.about_facts_area({ area: CENTER.serviceArea })}
            </p>
          </Stage>
        </ul>
      </div>
    </section>
  );
}
