import { cn } from "cn";
import { LockKeyholeIcon } from "lucide-react";
import { useId } from "react";

import { FieldError } from "~/components/ui/field";
import { describeBreed, describeDogAge } from "~/lib/dog-format";
import { formatDate } from "~/lib/locale-format";
import { DOG_BREED_PURITY_LABELS } from "~/orpc/dog/constants";
import type { Dog } from "~/orpc/dog/contract";
import { m } from "~/paraglide/messages";

/*===== Locked Fields =====*/
/**
 * The breed type, the breed(s) and the birth date as three engraved plates, in place of their inputs, once the dog is
 * evaluated (app-spec F2): they decide which courses the dog fits, so only the Admin changes them. The breed is the line
 * the site prints («پامرانین × شیتزو», «میکس، شبیه هاسکی»). One note under all three says why, beside a gold lock; the
 * `padlock` dog on the plate's edge says it too, in his bubble. A dog evaluated before the breed type was asked shows
 * «ثبت نشده» there, and keeps it.
 *
 * Nothing is editable here and nothing needs to be registered: the form submits the stored values (see `toDogInput`).
 * The errors are the server's messages if a change somehow got through, such as an evaluation that landed while the
 * form was open.
 */
export function LockedFields({
  dog,
  purityError,
  breedError,
  birthError,
}: {
  dog: Pick<Dog, "breedPurity" | "breed" | "breedSecondary" | "birthDate" | "birthDateApproximate">;
  purityError?: { message?: string };
  breedError?: { message?: string };
  birthError?: { message?: string };
}) {
  const noteId = useId();
  const breed = describeBreed(dog);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/*------ Breed Type ------*/}
        <Plate label={m.account_dog_form_field_purity()} noteId={noteId} error={purityError}>
          {dog.breedPurity ? (
            <span className="font-bold">{DOG_BREED_PURITY_LABELS[dog.breedPurity]}</span>
          ) : (
            <span className="text-muted-foreground">{m.account_dog_form_locked_not_set()}</span>
          )}
        </Plate>

        {/*------ Breed ------*/}
        <Plate label={m.account_dog_form_field_breed()} noteId={noteId} error={breedError}>
          {breed ? (
            <span className="font-bold text-pretty">{breed}</span>
          ) : (
            <span className="text-muted-foreground">{m.account_dog_form_locked_not_set()}</span>
          )}
        </Plate>

        {/*------ Birth Date ------*/}
        <Plate
          label={m.account_dog_form_field_birth_date()}
          noteId={noteId}
          error={birthError}
          className="sm:col-span-2"
        >
          <span className="font-bold">
            {dog.birthDateApproximate
              ? m.account_dog_form_date_approximate({ date: formatDate(dog.birthDate) })
              : formatDate(dog.birthDate)}
          </span>
          <span className="text-sm text-muted-foreground">{describeDogAge(dog)}</span>
        </Plate>
      </div>

      {/*------ Shared Note ------*/}
      <p id={noteId} className="flex items-start gap-2 text-sm text-pretty text-muted-foreground">
        <LockKeyholeIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        {m.account_dog_form_locked_note()}
      </p>
    </div>
  );
}

/*===== Plate =====*/
/** One engraved read-only value with its visible label above it and the shared note as its description. */
function Plate({
  label,
  noteId,
  error,
  className,
  children,
}: {
  label: string;
  noteId: string;
  error?: { message?: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // A fieldset names the plate by its legend and carries the shared note as its description.
    <fieldset aria-describedby={noteId} className={cn("flex min-w-0 flex-col gap-2", className)}>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      <div className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-primary/35 bg-card paper-grain px-4 py-2 shadow-[inset_0_0_0_3px_rgb(20_20_20),inset_0_0_0_4px_rgb(255_194_26/0.12)]">
        <div className="flex min-w-0 flex-col">{children}</div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary">
          <LockKeyholeIcon aria-hidden strokeWidth={1.8} className="size-4" />
        </span>
      </div>
      {/* Keyed by the message, so a new one rises in again. */}
      <FieldError key={error?.message} errors={[error]} className="answer-in" />
    </fieldset>
  );
}
