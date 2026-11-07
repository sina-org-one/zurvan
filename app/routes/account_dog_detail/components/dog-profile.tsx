import { cn } from "cn";
import { LockKeyholeIcon } from "lucide-react";

import { MascotCut } from "~/components/mascot-cut";
import { describeBreed, describeDogAge, describeWeight } from "~/lib/dog-format";
import { formatDate, formatNumber } from "~/lib/locale-format";
import {
  DOG_BREED_PURITY_LABELS,
  DOG_SEX_LABELS,
  DOG_TRAINING_GOAL_LABELS,
  VACCINATION_STATUS_LABELS,
} from "~/orpc/dog/constants";
import type { Dog } from "~/orpc/dog/contract";
import { RecordPhotos } from "~/routes/account_dog_detail/components/record-photos";
import { SectionHead } from "~/routes/account_dog_detail/components/section-head";
import { PLATE } from "~/routes/account_dog_detail/plate";
import { m } from "~/paraglide/messages";

/*===== Dog Profile =====*/
/**
 * «مشخصات» (it was the shared `DogProfile`; this page was its only reader): the dog's identity and health as ruled
 * label and value rows on a grained plate, then the owner's behaviour and medical notes when there are any. Once the
 * dog is evaluated, the breed type, breed and birth date are locked to the Admin (F2): a small lock beside each, and the line
 * under the rows says who can change them.
 *
 * The dog's bowls (dimmed scenery) stand on the plate's top edge: this is the everyday side of the file.
 */
export function DogProfile({ dog }: { dog: Dog }) {
  const notSet = <span className="font-normal text-muted-foreground">{m.account_dog_detail_profile_not_set()}</span>;
  const rows: { label: string; value: React.ReactNode; locked?: boolean; dir?: "auto" }[] = [
    {
      label: m.account_dog_detail_profile_breed_type(),
      value: dog.breedPurity ? DOG_BREED_PURITY_LABELS[dog.breedPurity] : notSet,
      locked: dog.isEvaluated,
    },
    {
      label: m.account_dog_detail_profile_breed(),
      value: describeBreed(dog) ?? notSet,
      locked: dog.isEvaluated,
    },
    { label: m.account_dog_detail_profile_sex(), value: DOG_SEX_LABELS[dog.sex] },
    {
      label: m.account_dog_detail_profile_birth(),
      value: (
        <>
          {dog.birthDateApproximate
            ? m.account_dog_detail_date_approximate({ date: formatDate(dog.birthDate) })
            : formatDate(dog.birthDate)}
          <span className="block text-sm font-normal text-muted-foreground">{describeDogAge(dog)}</span>
        </>
      ),
      locked: dog.isEvaluated,
    },
    { label: m.account_dog_detail_profile_weight(), value: describeWeight(dog.weightKg) },
    {
      label: m.account_dog_detail_profile_height(),
      value: dog.heightCm ? m.account_dog_detail_profile_height_value({ height: formatNumber(dog.heightCm) }) : notSet,
    },
    { label: m.account_dog_detail_profile_coat(), value: dog.coatColor ?? notSet, dir: "auto" },
    { label: m.account_dog_detail_profile_markings(), value: dog.markings ?? notSet, dir: "auto" },
    {
      label: m.account_dog_detail_profile_goals(),
      value: dog.trainingGoals.length
        ? dog.trainingGoals.map((goal) => DOG_TRAINING_GOAL_LABELS[goal]).join("، ")
        : notSet,
    },
    {
      label: m.account_dog_detail_profile_neutered(),
      value: dog.isNeutered ? m.account_dog_detail_yes() : m.account_dog_detail_no(),
    },
    { label: m.account_dog_detail_profile_vaccines(), value: VACCINATION_STATUS_LABELS[dog.vaccinationStatus] },
    {
      label: m.account_dog_detail_profile_microchip(),
      // Digits stay Latin and left to right, as they are printed on the chip.
      value: dog.microchipNumber ? (
        <span dir="ltr" className="tabular-nums">
          {dog.microchipNumber}
        </span>
      ) : (
        notSet
      ),
    },
    {
      label: m.account_dog_detail_profile_chip_date(),
      value: dog.microchipImplantedOn ? formatDate(dog.microchipImplantedOn) : notSet,
    },
  ];

  const problems = dog.behaviorProblems;
  const notes = [
    { label: m.account_dog_detail_profile_behavior(), text: dog.behaviorNotes?.trim() },
    { label: m.account_dog_detail_profile_health(), text: dog.medicalNotes?.trim() },
    { label: m.account_dog_detail_profile_vaccine_notes(), text: dog.vaccinationNotes?.trim() },
  ].flatMap(({ label, text }) => (text ? [{ label, text }] : []));

  return (
    <section aria-labelledby="profile-title">
      <SectionHead id="profile-title" title={m.account_dog_detail_profile_title()}>
        <MascotCut name="bowls" className="w-32 translate-y-[4%] sm:w-36" />
      </SectionHead>

      <div className={cn(PLATE, "px-5 py-2 sm:px-6")}>
        {/*===== Rows =====*/}
        <dl className="divide-y divide-dashed divide-foreground/15">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-6 py-3">
              <dt className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                {row.label}
                {row.locked && <LockKeyholeIcon aria-hidden className="size-3.5 text-primary/70" />}
              </dt>
              <dd dir={row.dir} className="min-w-0 text-end font-bold text-pretty">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {dog.isEvaluated && (
          <p className="flex items-start gap-2 border-t border-foreground/15 py-3 text-sm text-pretty text-muted-foreground">
            <LockKeyholeIcon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
            {m.account_dog_detail_profile_lock_note()}
          </p>
        )}

        {/*===== Notes =====*/}
        {(notes.length > 0 || problems.length > 0) && (
          <dl className="divide-y divide-dashed divide-foreground/15 border-t border-foreground/15">
            {/*------ Behavior Problems ------*/}
            {problems.length > 0 && (
              <div className="flex flex-col gap-2 py-3">
                <dt className="text-sm text-muted-foreground">{m.account_dog_detail_profile_problems()}</dt>
                <dd>
                  <ul className="flex flex-col gap-1.5">
                    {problems.map((problem) => (
                      <li key={problem} className="flex items-start gap-2.5">
                        <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-primary" />
                        {/* The owner's own words, in whichever language they typed them. */}
                        <span dir="auto" className="min-w-0 text-pretty">
                          {problem}
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {/*------ Written Notes ------*/}
            {notes.map((note) => (
              <div key={note.label} className="flex flex-col gap-1 py-3">
                <dt className="text-sm text-muted-foreground">{note.label}</dt>
                {/* The owner's own words, in whichever language they typed them. */}
                <dd dir="auto" className="text-pretty whitespace-pre-line">
                  {note.text}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/*===== Photos =====*/}
        <RecordPhotos dog={dog} />
      </div>
    </section>
  );
}
