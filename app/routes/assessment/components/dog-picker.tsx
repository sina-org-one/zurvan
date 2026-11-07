import { linkOptions } from "@tanstack/react-router";
import { cn } from "cn";
import { BadgeCheckIcon, CheckIcon, PhoneCallIcon, PlusIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { ChalkBubble } from "~/components/chalk-bubble";
import { Link } from "~/components/link";
import type { Media } from "~/orpc/media/contract";
import { m } from "~/paraglide/messages";
import { RisingError } from "~/routes/assessment/components/rising-error";
import { TapedPrint } from "~/routes/assessment/components/taped-print";
import { useChanged } from "~/routes/assessment/hooks/use-changed";

/*===== Types =====*/
/** Whether a dog can ask for an evaluation now (app-spec F3, "Who can request an evaluation"). */
export type DogRequestState = "requestable" | "pending" | "evaluated";

export type DogChoice = {
  id: string;
  name: string;
  breed: string | null;
  photo: Media | null;
  state: DogRequestState;
};

/** The way to add a dog and come straight back here with it picked (`?dog=`). */
export const NEW_DOG_LINK = linkOptions({ to: "/account/dogs/new", search: { redirectTo: "/assessment" } });

/*===== Dog Picker =====*/
/**
 * «کدوم سگ؟»: one card per dog, its photo as a small taped print, its name and breed; native radios underneath so
 * arrow keys, the form library and screen readers behave as for any radio group. A dog that can't ask now stays in the
 * list, disabled, with the reason in words: hiding it would leave the owner wondering where it went.
 *
 * The picked card gets the gold border and the tick, and the picked dog answers from its print in a small chalk bubble,
 * «آماده‌م!». It pops when a dog is picked (keyed by the dog), not on load: a dog picked for you (the only one, or the
 * one `?dog=` named) is simply already saying it.
 */
export function DogPicker({
  dogs,
  pickedId,
  registration,
  error,
}: {
  dogs: readonly DogChoice[];
  pickedId: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  const errorId = `${registration.name}-error`;
  const picked = useChanged(pickedId);

  return (
    <fieldset className="min-w-0" aria-invalid={!!error} aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">{m.assessment_form_dog_title()}</legend>

      <ul className="grid gap-x-4 gap-y-7 pt-5 sm:grid-cols-2">
        {dogs.map((dog, index) => {
          const requestable = dog.state === "requestable";
          const isPicked = dog.id === pickedId;
          return (
            <li key={dog.id} className="relative">
              <label className="group/dog block h-full">
                <input
                  type="radio"
                  value={dog.id}
                  disabled={!requestable}
                  aria-describedby={requestable ? undefined : `dog-reason-${dog.id}`}
                  className="peer sr-only"
                  {...registration}
                />
                {/*------ Card ------*/}
                <span
                  className={cn(
                    "flex h-full min-h-28 items-center gap-4 rounded-3xl border bg-card paper-grain p-3.5",
                    error ? "border-destructive/60" : "border-foreground/15",
                    requestable
                      ? "cursor-pointer pe-12 hover:border-primary/50 motion-safe:transition-[translate,border-color,background-color] motion-safe:hover:-translate-y-0.5"
                      : "cursor-not-allowed bg-card/50",
                    "peer-checked:border-primary peer-checked:bg-primary/10",
                    "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                  )}
                >
                  <TapedPrint
                    name={dog.name}
                    photo={dog.photo}
                    dimmed={!requestable}
                    tilt={index % 2 ? "rotate-2" : "-rotate-3"}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        "truncate font-display text-xl font-extrabold",
                        requestable ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <bdi>{dog.name}</bdi>
                    </span>
                    {dog.breed && <span className="truncate text-sm text-muted-foreground">{dog.breed}</span>}
                    {!requestable && <Reason dog={dog} />}
                  </span>
                </span>

                {/*------ Tick ------*/}
                <span
                  aria-hidden
                  className="pointer-events-none absolute end-4 top-1/2 grid size-7 -translate-y-1/2 scale-50 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 group-has-checked/dog:scale-100 group-has-checked/dog:opacity-100 motion-safe:transition-[scale,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(.3,1.5,.5,1)]"
                >
                  <CheckIcon className="size-4" strokeWidth={3} />
                </span>
              </label>

              {/*------ The Picked Dog Answers ------*/}
              {/* Over the card's top edge, its tail (physical right, 1.75rem in) pointing down at the print. Decoration:
                  the radio's checked state says the same. */}
              {isPicked && (
                <ChalkBubble
                  key={dog.id}
                  tail="right"
                  className={cn(
                    "pointer-events-none absolute start-3 -top-8 z-10 [--pop-origin:calc(100%-1.75rem)_100%] md:text-[15px]",
                    picked && "answer-pop",
                  )}
                >
                  <span aria-hidden>{m.assessment_picker_ready()}</span>
                </ChalkBubble>
              )}
            </li>
          );
        })}
      </ul>

      {/*------ Errors and the way to add a dog ------*/}
      <RisingError id={errorId} message={error} />
      <Link
        {...NEW_DOG_LINK}
        className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <PlusIcon aria-hidden className="size-4" />
        {m.assessment_picker_new_dog()}
      </Link>
    </fieldset>
  );
}

/*===== Reason =====*/
/** Why a dog can't ask now, in words with an icon (not colour alone). An evaluated dog's way on is its courses. */
function Reason({ dog }: { dog: DogChoice }) {
  return (
    <span
      id={`dog-reason-${dog.id}`}
      className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-pretty"
    >
      {dog.state === "pending" ? (
        <>
          <PhoneCallIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-bold text-muted-foreground">{m.assessment_picker_waiting()}</span>
        </>
      ) : (
        <>
          <BadgeCheckIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-bold text-muted-foreground">{m.assessment_picker_evaluated()}</span>
          <Link
            to="/courses"
            className="relative z-10 basis-full rounded-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {m.assessment_picker_see_courses()}
          </Link>
        </>
      )}
    </span>
  );
}
