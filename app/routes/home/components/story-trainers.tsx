import { cn } from "cn";
import { ArrowLeft, CalendarHeart, MapPin } from "lucide-react";

import { Link } from "~/components/link";
import { CENTER } from "~/lib/contact";
import { TRAINERS, ZURVAN_SINCE, type Trainer } from "~/lib/head-trainer";
import { LINKS } from "~/routes/home/content";
import { ChalkBubble } from "~/components/chalk-bubble";
import { MascotCut } from "~/components/mascot-cut";
import { m } from "~/paraglide/messages";

/*===== Tape =====*/
// A strip of translucent tape with torn ends.
const TAPE =
  "absolute h-5 w-16 bg-foreground/25 [clip-path:polygon(0_10%,6%_0,12%_12%,18%_0,82%_0,88%_10%,94%_0,100%_12%,100%_88%,94%_100%,88%_90%,82%_100%,18%_100%,12%_88%,6%_100%,0_90%)] md:w-20";

/*===== Trainer Print =====*/
/**
 * One trainer as a print taped to the wall, a little crooked, with their name and place in the team written on the
 * mount under the photo. Neighbouring prints lean opposite ways, so a row of them reads as pinned up by hand.
 */
function TrainerPrint({ trainer, index, several }: { trainer: Trainer; index: number; several: boolean }) {
  const photo = trainer.photos.withDog;

  return (
    <li className={cn("relative", several ? "w-44 shrink-0 snap-start sm:w-52" : "flex-1 lg:w-72 lg:flex-none")}>
      <figure className={cn("relative", index % 2 === 0 ? "-rotate-2" : "rotate-2")}>
        <div className="lively-reveal-pop rounded-sm border-2 border-foreground/80 bg-card p-2 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.9)] md:p-2.5">
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes={several ? "13rem" : "(min-width: 1024px) 18rem, 50vw"}
            width={photo.width}
            height={photo.height}
            alt={photo.alt}
            loading="lazy"
            className="aspect-[3/4] h-auto w-full object-cover"
          />
          <figcaption className="px-1 pt-2.5 pb-0.5">
            <span className="block font-display text-lg leading-snug font-extrabold text-foreground md:text-xl">
              {trainer.name}
            </span>
            <span className="mt-0.5 block text-sm text-foreground/70">{trainer.label}</span>
          </figcaption>
        </div>
        {/* Tape across the two top corners. One strip over the middle of the top edge read as a censor bar. */}
        <span aria-hidden className={`${TAPE} -top-1 -right-2.5 rotate-45 md:-right-4`} />
        <span aria-hidden className={`${TAPE} -top-1 -left-2.5 -rotate-45 md:-left-4`} />
      </figure>
    </li>
  );
}

/*===== Trainers =====*/
// Zurvan's trainers (`TRAINERS`), not one person's page: since 2026-11-06 the center may have several trainers, and the
// section introduces the team. With one trainer it keeps the old scene (the sitting dog beside one big print, then the
// copy); with several the prints become a row that scrolls sideways on phones and wraps from `lg`, under the copy.
//
// The scene's sides are logical: on the English pages (left to right) it is mirrored, and the sitting dog turns to face
// the prints, which are then on his other side.
export function StoryTrainers() {
  const several = TRAINERS.length > 1;

  return (
    <section
      aria-labelledby="st-trainers-title"
      className="relative mx-auto max-w-6xl px-4 pt-32 pb-16 md:px-8 md:pt-36 md:pb-20"
    >
      {/* He hangs from the band above: the image is cut flat at the top, so the cut sits on the band's bottom edge. */}
      <div aria-hidden className="absolute end-[6%] -top-px z-10 md:end-[8%]">
        <MascotCut name="upside" className="lively-swing w-20 md:w-28" />
      </div>
      <ChalkBubble
        tail="end"
        className="lively-float absolute end-[calc(6%+5.4rem)] top-6 z-10 w-40 md:end-[calc(8%+7.6rem)] md:top-5"
      >
        {m.home_trainers_hanging_bubble()}
      </ChalkBubble>

      {/* Foliage in the far corner, out in the page margin, so it never runs into the copy. */}
      <div aria-hidden className="absolute -end-28 bottom-6 hidden w-32 xl:block">
        <MascotCut name="plants" className="lively-sway w-full -scale-x-100" />
      </div>

      {/* On a tablet the prints' column is sized by the print, which would take all it can; the copy keeps 22rem. */}
      <div
        className={cn(
          "grid items-end gap-x-8 gap-y-8",
          several
            ? "lg:grid-cols-[auto_1fr] lg:gap-x-10"
            : "md:grid-cols-[auto_minmax(22rem,1fr)] lg:grid-cols-[auto_auto_1fr] lg:gap-x-10",
        )}
      >
        {/*------ Dog + taped prints ------*/}
        <div
          className={cn(
            "flex items-end gap-3",
            several ? "max-lg:order-last lg:contents" : "md:col-span-1 lg:contents",
          )}
        >
          <div className="relative w-[7.5rem] shrink-0 pt-16 sm:w-40 lg:w-56">
            <MascotCut name="plants" className="lively-sway-2 absolute start-0 bottom-0 w-24 lg:w-36" />
            <div className="lively-wiggle-late lively-pet relative">
              <MascotCut name="sit" className="block w-full -scale-x-100 ltr:scale-x-100" />
            </div>
            <ChalkBubble
              tail="end"
              className="lively-float-2 absolute start-0 top-0 w-[7.5rem] text-sm sm:w-36 lg:w-40 lg:text-lg"
            >
              {m.home_trainers_bubble()}
            </ChalkBubble>
          </div>

          <ul
            className={cn(
              "flex items-end",
              several
                ? "min-w-0 flex-1 snap-x gap-6 overflow-x-auto px-3 pt-3 pb-4 lg:flex-wrap lg:overflow-visible"
                : "flex-1 lg:flex-none",
            )}
          >
            {TRAINERS.map((trainer, index) => (
              <TrainerPrint key={trainer.name} trainer={trainer} index={index} several={several} />
            ))}
          </ul>
        </div>

        {/*------ Copy ------*/}
        {/* Three steps of type and no more: the heading in gold (the one gold line on the page, the owner's call,
            2026-10-20), one plain line under it (Zurvan's own trainers see and train the dog, a fact rather than a
            slogan), then the center's facts at body size. With several trainers the copy leads and the prints follow. */}
        <div className={cn("md:self-center", several && "lg:col-span-2 lg:row-start-1")}>
          <h2
            id="st-trainers-title"
            className="lively-reveal font-display text-3xl leading-[1.2] font-extrabold tracking-tight text-primary md:text-[2.6rem]"
          >
            {m.home_trainers_title()}
          </h2>
          <p className="mt-3 font-display text-xl leading-snug font-extrabold text-foreground md:text-2xl">
            {m.home_trainers_line()}
          </p>

          {/*------ Facts ------*/}
          <ul className="mt-6 flex flex-col gap-3 border-t border-foreground/15 pt-6 text-base text-foreground/85">
            <li className="flex items-center gap-3">
              <CalendarHeart aria-hidden className="size-5 shrink-0 text-primary" strokeWidth={1.8} />
              {m.home_trainers_since({ year: ZURVAN_SINCE.sinceYear })}
            </li>
            <li className="flex items-center gap-3">
              <MapPin aria-hidden className="size-5 shrink-0 text-primary" strokeWidth={1.8} />
              {m.home_trainers_area({ area: CENTER.serviceArea })}
            </li>
          </ul>

          <Link
            to={LINKS.about}
            className="mt-7 inline-flex items-center gap-1.5 rounded text-base font-bold text-foreground underline decoration-primary decoration-2 underline-offset-8 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          >
            {m.home_trainers_more()}
            <ArrowLeft aria-hidden className="size-4 ltr:-scale-x-100" />
          </Link>
        </div>
      </div>
    </section>
  );
}
