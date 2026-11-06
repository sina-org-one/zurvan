import { zodResolver } from "@hookform/resolvers/zod";
import { ORPCError } from "@orpc/client";
import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch, type FieldErrors, type UseFormSetError } from "react-hook-form";

import { FormAlert } from "~/components/form-alert";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { errorDataSchema } from "~/orpc/errors";
import type { Evaluation } from "~/orpc/evaluation/contract";
import { m } from "~/paraglide/messages";
import { DogPicker, type DogChoice } from "~/routes/assessment/components/dog-picker";
import { EvaluationMediaField } from "~/routes/assessment/components/evaluation-media-field";
import { FormPlate } from "~/routes/assessment/components/form-plate";
import { WhenFreeFields } from "~/routes/assessment/components/when-free-fields";
import { guideFor, type GuideMood } from "~/routes/assessment/guide";
import { useRequestEvaluation } from "~/routes/assessment/hooks/use-request-evaluation";
import {
  evaluationRequestSchema,
  toFormDefaults,
  toFormField,
  type EvaluationRequestInput,
  type EvaluationRequestValues,
} from "~/routes/assessment/schema";

/*===== Plates =====*/
/** Which plate each form field lives on, for «the first plate with an error». */
const FIELD_PLATE: Partial<Record<keyof EvaluationRequestInput, 1 | 2 | 3>> = {
  dogId: 1,
  earliestDay: 2,
  earliestMonth: 2,
  earliestYear: 2,
  availableDays: 2,
  availablePeriods: 2,
  photoMediaIds: 3,
  videoIds: 3,
};

function platesWithErrors(errors: FieldErrors<EvaluationRequestInput>): Set<number> {
  const plates = new Set<number>();
  for (const field of Object.keys(errors) as (keyof EvaluationRequestInput)[]) {
    const plate = FIELD_PLATE[field];
    if (plate) plates.add(plate);
  }
  return plates;
}

// The phone plates' dogs, each with the dimmed piece behind him (the sticky guide isn't on screen on a phone).
const CALENDAR_DOG = { name: "calendar", width: "w-24", scenery: { name: "clock", width: "62%" } } as const;
const CAMERA_DOG = { name: "camera", width: "w-[5.5rem]", scenery: { name: "tripod", width: "78%" } } as const;

/*===== Request Form =====*/
/**
 * The evaluation request: which dog, when the owner is free, and optionally photos and videos, as three numbered plates
 * joined by a chalk line, then the submit. It tells the page how the guide dog should look (`onGuideChange`: his mood,
 * from how far the form has got, the sending and a failed submit) and hands over the saved evaluation (`onSent`) so the
 * page can swap the plates for the receipt.
 */
export function RequestForm({
  dogs,
  defaultDogId,
  locked,
  onGuideChange,
  onSent,
  onNotRequestable,
}: {
  dogs: readonly DogChoice[];
  /** The dog to start on: the only requestable one, or the one `?dog=` named. Empty when the owner must pick. */
  defaultDogId: string;
  /** The request went through and the plates are on their way out: nothing more to send. */
  locked: boolean;
  /** `phonePlate1Failed`: a failed submit's first error is in plate ۱, which has no dog of its own on a phone. */
  onGuideChange: (guide: { mood: GuideMood; phonePlate1Failed: boolean }) => void;
  onSent: (evaluation: Evaluation) => void;
  /** The server says a dog already has an open request: the page reloads the dogs' states. */
  onNotRequestable: () => void;
}) {
  const requestEvaluation = useRequestEvaluation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, submitCount },
  } = useForm<EvaluationRequestInput, unknown, EvaluationRequestValues>({
    resolver: zodResolver(evaluationRequestSchema),
    defaultValues: toFormDefaults({ dogId: defaultDogId }),
  });
  // True while any file is still uploading: sending then would leave it out without the owner noticing.
  const [busy, setBusy] = useState(false);
  // The plate the person is in, for the phone plates' dogs.
  const [focused, setFocused] = useState<number | null>(null);

  /*------ How Far the Form Has Got ------*/
  const [dogId, photoMediaIds, videoIds, availableDays, availablePeriods] = useWatch({
    control,
    name: ["dogId", "photoMediaIds", "videoIds", "availableDays", "availablePeriods"],
  });
  const fileCount = photoMediaIds.length + videoIds.length;
  const whenDone = availableDays.length > 0 && availablePeriods.length > 0;
  const sending = requestEvaluation.isPending;

  /*------ The Guide's Mood ------*/
  // A failed submit wins while its errors stand; the field errors clear as they are fixed (the form re-validates on
  // change after a submit), a server's general refusal stays until the next try.
  const errorPlates = platesWithErrors(errors);
  const failed = submitCount > 0 && (errorPlates.size > 0 || !!errors.root);
  const mood: GuideMood = sending
    ? "sending"
    : failed
      ? errorPlates.size > 0
        ? "failed"
        : "serverFailed"
      : fileCount > 0
        ? "photos"
        : whenDone
          ? "ready"
          : dogId
            ? "when"
            : "pick";
  const firstErrorPlate = failed ? Math.min(...errorPlates) : null;
  const phonePlate1Failed = firstErrorPlate === 1;
  useEffect(() => onGuideChange({ mood, phonePlate1Failed }), [mood, phonePlate1Failed, onGuideChange]);

  /*------ A Dog That Just Became Unavailable ------*/
  // After a conflict the page reloads the dogs' states; a chosen dog that now has a request is let go.
  const chosenUnavailable = dogs.some((dog) => dog.id === dogId && dog.state !== "requestable");
  useEffect(() => {
    if (chosenUnavailable) setValue("dogId", "");
  }, [chosenUnavailable, setValue]);

  /*------ Files ------*/
  const handleFiles = useCallback(
    (value: { photoMediaIds: string[]; videoIds: string[] }) => {
      setValue("photoMediaIds", value.photoMediaIds);
      setValue("videoIds", value.videoIds);
    },
    [setValue],
  );

  /*------ Submit ------*/
  const onSubmit = handleSubmit((values) => {
    requestEvaluation.mutate(values, {
      onSuccess: onSent,
      onError: (error) => {
        applyServerError({ error, setError });
        if (error instanceof ORPCError && error.code === "NOT_REQUESTABLE") onNotRequestable();
      },
    });
  });

  /*------ What the Phone Plates' Dogs Say ------*/
  const errorLine = guideFor("failed").line;
  const whenSpeech = focused === 2 ? (errorPlates.has(2) && failed ? errorLine : guideFor("when").line) : null;
  const filesSpeech =
    focused === 3
      ? errorPlates.has(3) && failed
        ? errorLine
        : fileCount > 0
          ? guideFor("photos").line
          : m.assessment_guide_files_speech()
      : null;

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col">
      {/*===== Plates =====*/}
      <div className="flex flex-col gap-(--plate-gap) [--plate-gap:8rem] lg:[--plate-gap:3.5rem]">
        {/*------ ۱ Which Dog ------*/}
        <FormPlate
          number={1}
          titleId="plate-dog-title"
          title={m.assessment_form_dog_title()}
          description={m.assessment_form_dog_description()}
          done={!!dogId}
          onEnter={() => setFocused(1)}
        >
          <DogPicker dogs={dogs} pickedId={dogId} registration={register("dogId")} error={errors.dogId?.message} />
        </FormPlate>

        {/*------ ۲ When Free ------*/}
        <FormPlate
          number={2}
          titleId="plate-when-title"
          title={m.assessment_form_when_title()}
          description={m.assessment_form_when_description()}
          done={whenDone}
          dog={CALENDAR_DOG}
          speech={whenSpeech}
          onEnter={() => setFocused(2)}
        >
          <WhenFreeFields register={register} control={control} setValue={setValue} errors={errors} />
        </FormPlate>

        {/*------ ۳ Photos and Videos ------*/}
        {/* Last and optional: the owner's notes (2026-10-19) say photos and videos are not the main step and not a
            substitute for the form. */}
        <FormPlate
          number={3}
          titleId="plate-files-title"
          title={
            <>
              {m.assessment_form_files_title()}{" "}
              <span className="font-sans text-base font-medium text-muted-foreground">
                {m.assessment_form_files_optional()}
              </span>
            </>
          }
          description={m.assessment_form_files_description()}
          done={fileCount > 0}
          last
          dog={CAMERA_DOG}
          speech={filesSpeech}
          onEnter={() => setFocused(3)}
        >
          <EvaluationMediaField
            onChange={handleFiles}
            onBusyChange={setBusy}
            errors={{ photos: errors.photoMediaIds?.message, videos: errors.videoIds?.message }}
          />
        </FormPlate>
      </div>

      {/*===== Submit =====*/}
      <div className="mt-10 flex flex-col gap-3 lg:mt-12">
        {errors.root?.message && (
          <div key={errors.root.message} className="answer-in mb-2">
            <FormAlert message={errors.root.message} />
          </div>
        )}
        <Button
          type="submit"
          variant="solid"
          size="lg"
          disabled={sending || busy || locked}
          className="w-full sm:w-fit sm:min-w-72"
        >
          {sending && <Spinner />}
          {m.assessment_form_submit()}
        </Button>
        {busy && <output className="answer-in block text-sm text-muted-foreground">{m.assessment_form_busy()}</output>}
        <p className="text-sm text-pretty text-muted-foreground">{m.assessment_form_free_note()}</p>
      </div>
    </form>
  );
}

/*===== Server Errors =====*/
/**
 * Puts each failure where the owner will look: a field's message beside the field, a conflict (the dog already has a
 * request) and every other failure in the alert above the button.
 */
function applyServerError({ error, setError }: { error: Error; setError: UseFormSetError<EvaluationRequestInput> }) {
  const parsed = error instanceof ORPCError ? errorDataSchema.safeParse(error.data) : null;
  const code = error instanceof ORPCError ? error.code : null;

  if (code === "INVALID_INPUT" && parsed?.success) {
    for (const [field, message] of Object.entries(parsed.data.fields)) {
      const target = toFormField(field);
      if (target) setError(target, { message });
    }
    const [general] = parsed.data.errors;
    if (general) setError("root", { message: general });
    return;
  }
  if (code === "NOT_REQUESTABLE") {
    const [message] = parsed?.success ? parsed.data.errors : [];
    setError("root", { message: message ?? m.assessment_form_error_conflict() });
    return;
  }
  if (code === "UNAUTHORIZED") {
    setError("root", { message: m.assessment_form_error_unauthorized() });
    return;
  }
  if (code === "NOT_FOUND") {
    setError("root", { message: m.assessment_form_error_not_found() });
    return;
  }
  if (code === "INTERNAL_SERVER_ERROR") {
    const errorId = error instanceof ORPCError && typeof error.data?.errorId === "string" ? error.data.errorId : null;
    setError("root", {
      message: errorId ? m.assessment_form_error_internal_ref({ errorId }) : m.assessment_form_error_internal(),
    });
    return;
  }
  setError("root", { message: m.assessment_form_error_network() });
}
