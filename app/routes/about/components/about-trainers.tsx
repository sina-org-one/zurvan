import { cn } from "cn";
import { AwardIcon } from "lucide-react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { MascotCut } from "~/components/mascot-cut";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { TRAINERS, type Trainer } from "~/lib/head-trainer";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/about/column";

/*===== Tape =====*/
// A strip of translucent tape with torn ends, in a paper tone: the print's mount is ivory, so the ivory tape of the
// home page's dark print would vanish on it.
const TAPE =
  "absolute h-5 w-14 bg-[rgb(214_196_150/0.8)] [clip-path:polygon(0_10%,6%_0,12%_12%,18%_0,82%_0,88%_10%,94%_0,100%_12%,100%_88%,94%_100%,88%_90%,82%_100%,18%_100%,12%_88%,6%_100%,0_90%)] md:w-16";

/*===== Trainer Card =====*/
/**
 * One trainer on a grained card: their real photo as a crooked taped print at the start, and beside it their name in
 * gold, their place in the team, their trade and their credential. Every word is the trainer's own entry in `TRAINERS`.
 */
function TrainerCard({ trainer, index }: { trainer: Trainer; index: number }) {
  const photo = trainer.photos.standing;

  return (
    <li className="lively-reveal grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-5 rounded-4xl border border-border bg-card paper-grain p-5 shadow-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-7 sm:p-7">
      {/*------ The print ------*/}
      <figure className={cn("relative", index % 2 === 0 ? "-rotate-2" : "rotate-2")}>
        <div className="rounded-sm bg-foreground p-1.5 shadow-[0_14px_30px_-14px_rgb(0_0_0/0.9)] sm:p-2">
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="10rem"
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            className="aspect-[2/3] h-auto w-full object-cover"
          />
        </div>
        <span aria-hidden className={`${TAPE} -top-3 -right-3 rotate-45`} />
        <span aria-hidden className={`${TAPE} -top-3 -left-3 -rotate-45`} />
      </figure>

      {/*------ The words ------*/}
      <div className="min-w-0 pt-1">
        <h3 className="font-display text-2xl leading-snug font-extrabold text-primary sm:text-3xl">{trainer.name}</h3>
        <p className="mt-1 font-bold text-foreground">{trainer.label}</p>
        <p className="mt-3 text-pretty text-muted-foreground">{trainer.role}</p>
        <p className="mt-4 flex items-start gap-2.5 text-sm font-bold text-pretty text-foreground/85">
          <AwardIcon aria-hidden strokeWidth={1.6} className="mt-0.5 size-5 shrink-0 text-primary" />
          {trainer.credential}
        </p>
      </div>
    </li>
  );
}

/*===== Trainers =====*/
/**
 * «مربی‌های زروان»: the center's trainers (`TRAINERS`), one card each, two to a row from `lg`. Only the head trainer is
 * known so far; with one card the dog sits in the row's empty half, so the section never looks unfinished, and with
 * more cards he moves up beside the heading. Never pad the row with an invented trainer.
 */
export function AboutTrainers() {
  const single = TRAINERS.length === 1;

  /*------ The dog ------*/
  // Physical sides on purpose, like the hero's: the tail aims at the picture.
  const dog = (
    <div aria-hidden className="relative mx-auto w-28 pt-20 md:w-36 lg:mx-0">
      <div className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_45%_60%_at_50%_85%,rgb(255_194_26/0.08),transparent)]" />
      <MascotCut name="plants" className="lively-sway-2 absolute right-[80%] bottom-0 w-[52%] -scale-x-100" />
      <MascotCut name="sit" className="lively-breathe relative block w-full" />
      <ChalkBubble
        tail="left"
        className="lively-float-2 absolute bottom-[78%] left-[70%] w-max max-w-[10rem] text-pretty md:max-w-[13rem]"
      >
        {m.about_trainers_bubble()}
      </ChalkBubble>
    </div>
  );

  return (
    <section aria-labelledby="about-trainers-title" className={`${COLUMN} pt-section-md`}>
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 id="about-trainers-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
            {m.about_trainers_title()}
          </h2>
          <p className="mt-3 max-w-xl text-lead text-pretty text-muted-foreground">{m.about_trainers_line()}</p>
        </div>
        {!single && <div className="hidden shrink-0 sm:block">{dog}</div>}
      </div>

      <ul className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-2">
        {TRAINERS.map((trainer, index) => (
          <TrainerCard key={trainer.name} trainer={trainer} index={index} />
        ))}
        {single && (
          <li aria-hidden className="flex items-end justify-center max-lg:hidden">
            {dog}
          </li>
        )}
      </ul>
    </section>
  );
}
