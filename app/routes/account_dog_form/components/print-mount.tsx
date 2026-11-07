import { cn } from "cn";
import type { DeepPartial } from "react-hook-form";

import { ChalkBubble } from "~/components/chalk-bubble";
import { GroundStrip } from "~/components/ground-strip";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { entryCalendar } from "~/lib/date-entry";
import { toLatinDigits } from "~/lib/digits";
import { birthDateFromAge, describeBreed, describeDogAge, describeWeight } from "~/lib/dog-format";
import { DOG_BREED_PURITIES, DOG_SEX_LABELS, DOG_TRAINING_GOAL_LABELS, DOG_TRAINING_GOALS } from "~/orpc/dog/constants";
import type { Media } from "~/orpc/media/contract";
import { m } from "~/paraglide/messages";
import { PhotoPicker } from "~/routes/account_dog_form/components/photo-picker";
import { type DogFormInput, problemLines } from "~/routes/account_dog_form/schema";

/*===== Print Mount =====*/
/**
 * The buddy's file being written: the customer's dog's print pinned on a grained mount, filling in as the form is
 * typed. The print is the photo picker; the dog speaks for itself in a bubble from the print's corner («منم {name}!»,
 * or what it is doing while the form saves); its name is stamped in gold as it is typed, the facts line grows (the
 * breed as the site prints it, «پامرانین × شیتزو»), and on desktop the training goals hang under it as small tags and
 * what the trainer reads first echoes the behavior problems and the notes. The dog's bed and bowls wait at the mount's foot on a
 * short path. No drawn dog here: this column is the customer's dog's, and the mascot never stands for it.
 *
 * One grid, two layouts (the picker is rendered once, so CSS only moves things):
 * - Phones: a compact strip, the 7rem print at the start with the name and facts beside it and the picker's actions
 *   under them, the bubble under the strip with its tail up at the print. No notes, no scenery: the first plate must
 *   start within the first screen and a half.
 * - Desktop (sticky beside the form): the 20rem print, the bubble over its bottom edge at the start and the actions at
 *   the end of the same row, the name and facts, the notes, the path with the bed and bowls.
 *
 * The name, facts and notes are a visual echo of the inputs, so they are `aria-hidden`; only the picker is read.
 */
export function PrintMount({
  values,
  bubbleLine,
  photo,
  onPhotoChange,
  onBusyChange,
  photoError,
  className,
}: {
  /** The form's live values (`useWatch({ control })`). */
  values: DeepPartial<DogFormInput>;
  /** What the dog says from its print (null: no bubble, before a name is typed). */
  bubbleLine: string | null;
  /** The uploaded photo (the form only stores its id); null when none. */
  photo: Media | null;
  onPhotoChange: (media: Media | null) => void;
  /** True while an upload runs, so the form can hold its submit. */
  onBusyChange: (busy: boolean) => void;
  /** A server message about the photo, from saving the form. */
  photoError?: string;
  /** Grid placement from the form (sticky, columns, rows). */
  className?: string;
}) {
  const name = values.name?.trim() ?? "";
  // Shown as it will be saved: Latin digits, no spaces.
  const microchipNumber = toLatinDigits(values.microchipNumber ?? "").replace(/\s+/g, "") || null;
  const facts = describePartialFacts(values);
  // In the order the trainer reads them: the problems one by one, then the notes; the first four.
  const notes = [
    ...problemLines(values.behaviorProblems ?? ""),
    ...[values.behaviorNotes, values.medicalNotes].map((note) => note?.trim() ?? ""),
  ]
    .filter(Boolean)
    .slice(0, 4);
  const goals = DOG_TRAINING_GOALS.filter((goal) => values.trainingGoals?.includes(goal));

  return (
    <aside
      aria-label={m.account_dog_form_preview_label()}
      className={cn(
        "relative grid grid-cols-[7rem_minmax(0,1fr)] content-start gap-x-4 overflow-hidden rounded-4xl border border-border/60 bg-sunken paper-grain p-4 shadow-[0_24px_48px_-28px_rgb(0_0_0/0.9)]",
        "lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-3 lg:p-8 lg:pb-0",
        className,
      )}
    >
      {/* A pool of warm light behind the print. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(ellipse_40%_70%_at_85%_45%,rgb(255_194_26/0.08),transparent)] lg:h-[26rem] lg:bg-[radial-gradient(ellipse_55%_50%_at_50%_50%,rgb(255_194_26/0.09),transparent)]"
      />

      {/*===== Print and Actions =====*/}
      <PhotoPicker
        media={photo}
        onChange={onPhotoChange}
        onBusyChange={onBusyChange}
        error={photoError}
        tagName={name || m.account_dog_form_tag_empty()}
        microchipNumber={microchipNumber}
        frameClassName="col-start-1 row-span-2 row-start-1 self-start pt-1 lg:col-span-2 lg:row-span-1 lg:mx-auto lg:w-[20rem] lg:max-w-full lg:pt-2"
        actionsClassName="col-start-2 row-start-2 mt-3 self-start lg:col-start-2 lg:row-start-2 lg:mt-5 lg:items-end"
      />

      {/*===== Name and Facts =====*/}
      <div
        aria-hidden
        className="relative col-start-2 row-start-1 min-w-0 self-end lg:col-span-2 lg:col-start-1 lg:row-start-3 lg:mt-5 lg:self-auto"
      >
        {/* Keyed by the name so every change remounts it and replays the stamp, as on the tag. */}
        <p
          key={name}
          className={cn(
            "truncate font-display text-3xl leading-[1.3] font-black lg:text-5xl",
            name ? "text-primary motion-safe:animate-tag-stamp" : "text-muted-foreground/70",
          )}
        >
          {/* A dog's name can be Latin; `bdi` keeps it from flipping the sentence around it. */}
          {name ? <bdi>{name}</bdi> : m.account_dog_form_name_empty()}
        </p>
        <p className="mt-1 text-sm text-pretty text-muted-foreground lg:mt-2 lg:text-base">
          {facts || m.account_dog_form_facts_empty()}
        </p>
        {goals.length > 0 && (
          <ul className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
            {goals.map((goal) => (
              <li
                key={goal}
                className="answer-in rounded-full border border-primary/50 px-2.5 py-0.5 text-xs font-bold text-primary"
              >
                {DOG_TRAINING_GOAL_LABELS[goal]}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*===== The Dog's Words =====*/}
      {/* Phones: under the strip. Desktop: pulled up over the print's bottom edge at the start. The tail is physical
          (top right), aimed up into the print. Keyed by the line, so a new name or the saving line pops again. */}
      <div
        aria-hidden
        className="relative z-10 col-span-2 row-start-3 flex items-start justify-start empty:hidden max-lg:mt-4 lg:col-span-1 lg:col-start-1 lg:row-start-2 lg:-ms-2 lg:-mt-7"
      >
        {bubbleLine && (
          <ChalkBubble
            key={bubbleLine}
            tail="right"
            tailEdge="top"
            className="answer-pop max-w-full text-pretty [--answer-delay:0.5s] [--pop-origin:calc(100%-2.25rem)_0] lg:max-w-[14rem]"
          >
            {bubbleLine}
          </ChalkBubble>
        )}
      </div>

      {/*===== What the Trainer Reads =====*/}
      <div
        aria-hidden
        className="relative mt-6 hidden border-t border-dashed border-foreground/20 pt-5 lg:col-span-2 lg:row-start-4 lg:block"
      >
        <p className="text-sm font-bold text-primary">{m.account_dog_form_trainer_reads()}</p>
        {notes.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2 text-sm text-pretty">
            {notes.map((note) => (
              <li key={note} dir="auto" className="answer-in line-clamp-2 border-s-2 border-primary/50 ps-3">
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-pretty text-muted-foreground">{m.account_dog_form_notes_empty()}</p>
        )}
      </div>

      {/*===== His Place, Waiting =====*/}
      {/* Physical sides: a picture, not reading order. Dimmed scenery only: the bed and the bowls are his. */}
      <div aria-hidden className="relative -mx-8 mt-2 hidden h-32 lg:col-span-2 lg:row-start-5 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_60%_at_50%_85%,rgb(255_194_26/0.08),transparent)]" />
        <NightSky className="top-1 right-[8%] h-12 w-[34%]" />
        <GroundStrip className="absolute inset-x-0 bottom-0 h-8 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]" />
        <MascotCut name="plants" className="lively-sway absolute right-[6%] bottom-4 w-[11%] -scale-x-100" />
        <MascotCut name="dog-bed" className="absolute right-[16%] bottom-4 w-[40%] translate-y-[4%]" />
        <MascotCut name="bowls" className="absolute bottom-4 left-[14%] w-[30%] translate-y-[4%]" />
        <MascotCut name="plants" className="lively-sway-2 absolute bottom-4 left-[5%] w-[9%]" />
      </div>
    </aside>
  );
}

/*===== Facts =====*/
/** The facts line from whatever has been filled in so far; parts still empty are left out. */
function describePartialFacts(values: DeepPartial<DogFormInput>): string {
  const parts: string[] = [];
  if (values.sex) parts.push(DOG_SEX_LABELS[values.sex]);

  const breed = describeBreed({
    breedPurity: DOG_BREED_PURITIES.find((purity) => purity === values.breedPurity) ?? null,
    breed: values.breed?.trim() || null,
    breedSecondary: values.breedSecondary?.trim() || null,
  });
  if (breed) parts.push(breed);

  const birthDate = previewBirthDate(values);
  if (birthDate) {
    parts.push(describeDogAge({ birthDate, birthDateApproximate: values.birthMode === "approximate" }));
  }

  const weight = Number(toLatinDigits(values.weight ?? "").replace(/[٫,/]/g, "."));
  if (values.weight && !Number.isNaN(weight) && weight > 0) parts.push(describeWeight(weight));

  return parts.join(m.shared_dog_facts_joiner());
}

/** The birth date the form's parts add up to, or null while they are incomplete or not a real date. */
function previewBirthDate(values: DeepPartial<DogFormInput>): string | null {
  if (values.birthMode === "approximate") {
    if (!values.ageYears || !values.ageMonths) return null;
    return birthDateFromAge({ years: Number(values.ageYears), months: Number(values.ageMonths) });
  }
  const calendar = entryCalendar();
  const date = { year: Number(values.birthYear), month: Number(values.birthMonth), day: Number(values.birthDay) };
  return date.year && date.month && date.day && calendar.isValid(date) ? calendar.toIso(date) : null;
}
