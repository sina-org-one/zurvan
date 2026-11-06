import { zodResolver } from "@hookform/resolvers/zod";
import { linkOptions, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { FormAlert } from "~/components/form-alert";
import { GroundStrip } from "~/components/ground-strip";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { Button, buttonVariants } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { toast } from "~/components/ui/toast";
import type { Dog } from "~/orpc/dog/contract";
import type { Media } from "~/orpc/media/contract";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/account_dog_form/column";
import { BodyFields } from "~/routes/account_dog_form/components/body-fields";
import { FormMotion } from "~/routes/account_dog_form/components/form-motion";
import { FormPlate, type PlateGuide } from "~/routes/account_dog_form/components/form-plate";
import { HealthFields } from "~/routes/account_dog_form/components/health-fields";
import { IdentityFields } from "~/routes/account_dog_form/components/identity-fields";
import { JumpList } from "~/routes/account_dog_form/components/jump-list";
import { PrintMount } from "~/routes/account_dog_form/components/print-mount";
import { StepRoad } from "~/routes/account_dog_form/components/step-road";
import { TrainingFields } from "~/routes/account_dog_form/components/training-fields";
import { clearDraft, readDraft, writeDraft } from "~/routes/account_dog_form/draft";
import { useDebouncedValue } from "~/routes/account_dog_form/hooks/use-debounced-value";
import { useSaveDog } from "~/routes/account_dog_form/hooks/use-save-dog";
import {
  type DogFormInput,
  type DogFormValues,
  dogFormSchema,
  toDogInput,
  toFormDefaults,
} from "~/routes/account_dog_form/schema";
import {
  DOG_FORM_SECTIONS,
  DOG_FORM_STEP_COUNT,
  type DogFormSection,
  fieldsOfSection,
  firstFieldOf,
  firstSectionOf,
  sectionOfStep,
  stepOfSection,
} from "~/routes/account_dog_form/sections";
import { applyServerError } from "~/routes/account_dog_form/server-errors";

/*===== The Guides =====*/
// The center's dog looks after each plate and says what it is for, in his first person, about his buddy («رفیقم»).
// Every line is also said in plain words by the plate's description, so the bubbles are for the eyes only. The words
// live in messages and are read while rendering (`plateVoice`), so they follow the page's language.
//
// Each plate's dog and the scenery that means something there: the name card by the hall stand where his leash will
// hang (the padlock once the identity is locked), the scale by the grooming box, the clipboard of ticked lines by the
// vet's clinic, and the attentive sit by the training field's chalkboard. Widths stay under about 1.3x each cut-out's
// natural width.
const GUIDES: Record<"identity" | "locked" | DogFormSection, PlateGuide> = {
  identity: {
    dog: "badge",
    dogClassName: "w-[4.75rem] sm:w-28",
    idle: "lively-breathe",
    scenery: "hall-stand",
    sceneryClassName: "-ms-4 w-14 sm:-ms-6 sm:w-28",
  },
  locked: {
    dog: "padlock",
    dogClassName: "w-[4.75rem] sm:w-28",
    idle: "lively-breathe",
    scenery: "hall-stand",
    sceneryClassName: "-ms-4 w-14 sm:-ms-6 sm:w-28",
  },
  body: {
    dog: "scale",
    dogClassName: "w-[5.5rem] sm:w-32",
    idle: "lively-breathe",
    scenery: "first-aid",
    sceneryClassName: "-ms-3 w-14 sm:-ms-5 sm:w-28",
  },
  health: {
    dog: "clipboard",
    dogClassName: "w-[4.25rem] sm:w-24",
    idle: "lively-tilt",
    scenery: "clinic",
    sceneryClassName: "-ms-3 w-16 sm:-ms-5 sm:w-32",
  },
  training: {
    dog: "course-basics",
    dogClassName: "w-[4rem] sm:w-[5.5rem]",
    idle: "lively-breathe",
    scenery: "chalkboard",
    sceneryClassName: "-ms-3 w-14 sm:-ms-5 sm:w-28",
    dimScenery: true,
  },
};

/*===== Dog Form =====*/
/**
 * The whole body of the page that adds a dog or edits one: the header the page passes in, the print mount (the
 * customer's dog's photo as a taped print that is also the picker, its name stamped as it is typed, its bubble) and the
 * form in four plates (who it is, its body, its health papers, its training), each looked after by the center's dog on
 * its top edge. One `useForm` holds every field either way.
 *
 * **A new dog** (`step` is a number) goes one plate per step, the step in the URL (`?step=`): the road above the plate
 * shows where the owner is; «بعدی» checks only this step's fields and pushes the next step onto history (so a phone's
 * back button goes back a step); the health and training steps can be left for later («بعداً»), and the last step
 * saves. A step opened by URL while an earlier step still has a red field goes back to it (`replace`). What is typed
 * is kept as a draft in `sessionStorage` until the dog is saved (`draft.ts`; the photos' uploads are not). An error,
 * the form's own or the server's, takes the owner to the step of its first field and focuses it.
 *
 * **An edit** (`step` is null) shows the four plates on one page with a jump list under the header, and saves
 * everything. Once the dog is evaluated its breed type, breed(s) and birth date are locked (app-spec F2): shown, not
 * editable, and submitted as stored.
 *
 * Saving a new dog goes to the Dashboard and saving an edit to the dog's page, or either goes back to `redirectTo`
 * when another page sent the owner here.
 *
 * **Who speaks:** one plate's dog at a time. A new dog's step is its plate's; on the edit page it is the identity
 * plate's on load, and focus moving into another plate hands him the word. A failed check gives it to the first plate
 * with an error, who says the error line while the form focuses its first red field.
 */
export function DogForm({
  dog,
  redirectTo,
  step,
  header,
}: {
  dog: Dog | null;
  redirectTo: string | null;
  /** The new dog's step (1 to 4); null when editing, which shows every plate. */
  step: number | null;
  header: React.ReactNode;
}) {
  const navigate = useNavigate();
  const saveDog = useSaveDog({ dogId: dog?.id ?? null });
  const locked = dog?.isEvaluated === true;
  const stepMode = step !== null;
  const currentStep = step ?? 1;
  const currentSection = sectionOfStep(currentStep);

  const form = useForm<DogFormInput, unknown, DogFormValues>({
    resolver: zodResolver(dogFormSchema),
    defaultValues: toFormDefaults(dog),
    // In steps the red field may be on a hidden plate: the form goes to its step first, then focuses it.
    shouldFocusError: !stepMode,
  });
  const { control, handleSubmit, setError, setFocus, setValue, trigger, reset, getValues, getFieldState } = form;
  const errors = form.formState.errors;

  /*------ The Print's State ------*/
  const values = useWatch({ control });
  // The form submits only the photo's id; the print needs the uploaded image itself.
  const [photo, setPhoto] = useState<Media | null>(dog?.photo ?? null);
  // Submitting mid-upload would save the dog without the photos still on their way: the print's and the three lists'.
  const [busyParts, setBusyParts] = useState<Record<string, boolean>>({});
  const setBusy = useCallback(
    (part: string, busy: boolean) =>
      setBusyParts((current) => (current[part] === busy ? current : { ...current, [part]: busy })),
    [],
  );
  const setPrintBusy = useCallback((busy: boolean) => setBusy("print", busy), [setBusy]);
  const busy = Object.values(busyParts).some(Boolean);
  // The print's bubble answers a finished name, not every keystroke (the stamped name under it does that).
  const settledName = useDebouncedValue({ value: values.name?.trim() ?? "", delay: 600 });
  const saving = saveDog.isPending || saveDog.isSuccess;
  const printLine = saving
    ? dog
      ? m.account_dog_form_print_saving_edit()
      : m.account_dog_form_print_saving_new()
    : settledName
      ? m.account_dog_form_print_name({ name: settledName })
      : null;

  /*------ Who Speaks ------*/
  // `key` grows each time a plate takes the word, so that plate's bubble pops again even when it already had it.
  const [speaker, setSpeaker] = useState<{ section: DogFormSection; error: boolean; key: number }>({
    section: currentSection,
    error: false,
    key: 0,
  });
  const focusSection = (section: DogFormSection) =>
    // Staying inside the same plate keeps its words (an error line stays while its red fields are being fixed).
    setSpeaker((current) => (current.section === section ? current : { section, error: false, key: current.key + 1 }));
  const speakErrorIn = (section: DogFormSection) =>
    setSpeaker((current) => ({ section, error: true, key: current.key + 1 }));
  const speakError = (fields: readonly string[]) => {
    const section = firstSectionOf(fields);
    if (section) speakErrorIn(section);
  };
  const plateVoice = (section: DogFormSection, line: string) => ({
    line: speaker.section === section && speaker.error ? m.account_dog_form_line_error() : line,
    speaking: speaker.section === section,
    speakerKey: speaker.key,
    firstLoad: speaker.key === 0,
    onFocusSection: focusSection,
  });

  /*------ Step Changes ------*/
  // Adjusted during render, so the slide, the road and the new plate's bubble start in the same frame. The direction
  // picks the slide; the plate that now shows takes the word (keeping an error line meant for it).
  const [shownStep, setShownStep] = useState<{ step: number; dir: "fwd" | "back" | null }>({
    step: currentStep,
    dir: null,
  });
  if (stepMode && shownStep.step !== currentStep) {
    setShownStep({ step: currentStep, dir: currentStep > shownStep.step ? "fwd" : "back" });
    setSpeaker((current) => ({
      section: currentSection,
      error: current.section === currentSection && current.error,
      key: current.key + 1,
    }));
  }

  const goToStep = useCallback(
    (target: number, replace = false) =>
      navigate({
        to: "/account/dogs/new",
        search: (previous) => ({ ...previous, step: target === 1 ? undefined : target }),
        replace,
        resetScroll: false,
      }),
    [navigate],
  );

  /**
   * Shows `target`'s step (pushing history), then, once it is on screen, focuses `field` there or else the plate's
   * heading, backing up to the road when the owner pressed «بعدی» at the foot of a long plate.
   */
  const moveTo = async (target: number, field: keyof DogFormInput | null = null) => {
    if (target === currentStep) {
      if (field) setFocus(field);
      return;
    }
    await goToStep(target);
    window.requestAnimationFrame(() => {
      const road = document.getElementById("df-steps");
      if (road && road.getBoundingClientRect().top < 0) {
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        road.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      }
      if (field) {
        setFocus(field);
      } else {
        const section = sectionOfStep(target);
        document.querySelector<HTMLElement>(`[data-plate-heading="${section}"]`)?.focus({ preventScroll: true });
      }
    });
  };

  /** The first red field of a step, after its check ran. */
  const firstInvalidOf = (section: DogFormSection) =>
    firstFieldOf(fieldsOfSection(section).filter((field) => getFieldState(field).invalid));

  /**
   * Goes to `target`: back is always open; ahead runs each step's check on the way and stops at the first step with a
   * red field, which speaks the error line.
   */
  const pickStep = async (target: number) => {
    for (let index = currentStep; index < target; index += 1) {
      const section = sectionOfStep(index);
      markChecked(section);
      if (!(await trigger(fieldsOfSection(section)))) {
        speakErrorIn(section);
        await moveTo(index, firstInvalidOf(section));
        return;
      }
    }
    await moveTo(target);
  };

  /*------ Checked Steps ------*/
  // A step check is a `trigger()`, which doesn't count as a submit, so the form's own "validate again on change after
  // a submit" never starts for it. Once a step has been checked, any change to one of its fields checks that step's
  // fields again, so a red field clears (or turns red again) as the owner fixes it, as after a real submit. Steps not
  // checked yet stay quiet. A restored draft starts with none (the restore runs before any check). Checking a whole
  // step again is cheap: one resolver run.
  const [checkedSections, setCheckedSections] = useState<ReadonlySet<DogFormSection>>(() => new Set());
  const markChecked = useCallback(
    (section: DogFormSection) =>
      setCheckedSections((current) => (current.has(section) ? current : new Set([...current, section]))),
    [],
  );

  // Driven by the watched values (each change is a new object), so it runs once per change, not per render.
  useEffect(() => {
    if (!stepMode || !values) return;
    for (const section of checkedSections) void trigger(fieldsOfSection(section));
  }, [stepMode, checkedSections, values, trigger]);

  /*------ Draft ------*/
  // Read after the first render (storage is the browser's, and the server rendered the empty form), then kept as the
  // owner types. Nothing is stored for an edit. The guard below is declared after this, so on load it reads the
  // restored values.
  useEffect(() => {
    if (!stepMode) return;
    const draft = readDraft();
    if (draft) reset({ ...toFormDefaults(null), ...draft } as DogFormInput);
  }, [stepMode, reset]);

  useEffect(() => {
    if (!stepMode || saveDog.isSuccess) return;
    // A first render's empty values are written only if nothing replaces them within the delay (the restore does).
    const timer = window.setTimeout(() => writeDraft(values), 300);
    return () => window.clearTimeout(timer);
  }, [stepMode, values, saveDog.isSuccess]);

  /*------ Step Guard ------*/
  // A step opened by URL (a reload, a shared link, the browser's forward button) while an earlier step still has a red
  // field goes back to the first such step, replacing the entry, and shows what is red there.
  useEffect(() => {
    if (!stepMode || currentStep === 1) return;
    const result = dogFormSchema.safeParse(getValues());
    if (result.success) return;
    const section = firstSectionOf(result.error.issues.map((issue) => String(issue.path[0])));
    if (!section || stepOfSection(section) >= currentStep) return;
    markChecked(section);
    void goToStep(stepOfSection(section), true).then(() => trigger(fieldsOfSection(section)));
  }, [stepMode, currentStep, getValues, goToStep, trigger, markChecked]);

  /*------ Submit ------*/
  const onSubmit = handleSubmit(
    (submitted) => {
      saveDog.mutate(toDogInput({ values: submitted, dog }), {
        onSuccess: async (saved) => {
          if (!dog) clearDraft();
          toast.add({
            title: dog ? m.account_dog_form_toast_saved() : m.account_dog_form_toast_added({ name: saved.name }),
            type: "success",
          });
          // A new dog goes back with its id (`?dog=`), so the page that sent them here can preselect it. `redirectTo` is
          // any same-site path, so it goes in `href`, which the router parses.
          if (redirectTo) {
            const href = dog ? redirectTo : withDogParam({ redirectTo, dogId: saved.id });
            await navigate({ href });
            return;
          }
          // Without a `redirectTo`, a new dog goes to the Dashboard (where it now appears), an edit to the dog's page.
          await (dog
            ? navigate({ to: "/account/dogs/$dogId", params: { dogId: saved.id } })
            : navigate({ to: "/account" }));
        },
        onError: (error) => {
          const fields = applyServerError({ error, setError });
          speakError(fields);
          // The person is at the button: take them to the server's first red field, as the form's own check does.
          const first = firstFieldOf(fields);
          const section = firstSectionOf(fields);
          if (stepMode && section) void moveTo(stepOfSection(section), first);
          else if (first) setFocus(first);
        },
      });
    },
    // Called before the form focuses the first invalid field (the edit page), whose focus then lands in the same
    // plate; in steps the form goes to that field's step and focuses it there.
    (invalid) => {
      const fields = Object.keys(invalid);
      speakError(fields);
      const section = firstSectionOf(fields);
      if (stepMode && section) void moveTo(stepOfSection(section), firstFieldOf(fields));
    },
  );

  const goNext = () => void pickStep(currentStep + 1);
  const lastStep = currentStep === DOG_FORM_STEP_COUNT;

  /*------ Plates ------*/
  const identityLine = !dog
    ? m.account_dog_form_line_identity_new()
    : locked
      ? m.account_dog_form_line_identity_locked()
      : m.account_dog_form_line_identity_edit();

  const plates: Record<DogFormSection, React.ReactNode> = {
    identity: (
      <FormPlate
        id="identity"
        title={m.account_dog_form_plate_identity_title()}
        description={m.account_dog_form_plate_identity_description()}
        guide={locked ? GUIDES.locked : GUIDES.identity}
        {...plateVoice("identity", identityLine)}
      >
        <IdentityFields lockedDog={locked ? dog : null} />
      </FormPlate>
    ),
    body: (
      <FormPlate
        id="body"
        title={m.account_dog_form_plate_body_title()}
        description={m.account_dog_form_plate_body_description()}
        guide={GUIDES.body}
        {...plateVoice("body", m.account_dog_form_line_body())}
      >
        <BodyFields />
      </FormPlate>
    ),
    health: (
      <FormPlate
        id="health"
        title={m.account_dog_form_plate_health_title()}
        description={m.account_dog_form_plate_health_description()}
        guide={GUIDES.health}
        {...plateVoice("health", m.account_dog_form_line_health())}
      >
        <HealthFields photos={dog} onBusy={setBusy} />
      </FormPlate>
    ),
    training: (
      <FormPlate
        id="training"
        title={m.account_dog_form_plate_training_title()}
        description={m.account_dog_form_plate_training_description()}
        guide={GUIDES.training}
        {...plateVoice("training", m.account_dog_form_line_training())}
      >
        <TrainingFields />
      </FormPlate>
    ),
  };

  return (
    <FormProvider {...form}>
      <div className="overflow-x-clip">
        <FormMotion />

        <div
          className={cn(
            COLUMN,
            "grid grid-cols-[minmax(0,1fr)] pt-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12 lg:pt-12 xl:gap-x-16",
          )}
        >
          {/*===== Header =====*/}
          {/* Room under it for the first plate's bubble, which grows upwards when its line takes two lines. */}
          <div className="flex flex-col gap-6 pb-6 lg:col-start-1 lg:row-start-1 lg:pb-8">
            {header}
            {!stepMode && <JumpList className="mb-6" />}
          </div>

          {/*===== Print Mount =====*/}
          {/* Second in the document so phones see the dog between the heading and the form; desktop puts it at the end.
              A new dog's phone shows it only on the first step, where its photo is picked, so the later steps start
              on their plate. */}
          <PrintMount
            values={values}
            bubbleLine={printLine}
            photo={photo}
            onPhotoChange={(media) => {
              setPhoto(media);
              setValue("photoMediaId", media?.id ?? null, { shouldDirty: true });
            }}
            onBusyChange={setPrintBusy}
            photoError={errors.photoMediaId?.message}
            className={cn(
              "mb-12 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-2 lg:mb-0 lg:self-start",
              stepMode && currentStep > 1 && "max-lg:hidden",
            )}
          />

          {/*===== Form =====*/}
          <form
            method="post"
            onSubmit={(event) => {
              // Enter in a field of an earlier step means «بعدی», not saving half a dog.
              if (stepMode && !lastStep) {
                event.preventDefault();
                goNext();
                return;
              }
              void onSubmit(event);
            }}
            noValidate
            aria-busy={saveDog.isPending}
            className="flex min-w-0 flex-col gap-14 lg:col-start-1 lg:row-start-2"
          >
            {/*------ The Road ------*/}
            {stepMode && (
              <div id="df-steps" className="-mb-4 scroll-mt-24">
                <StepRoad step={currentStep} onPick={(target) => void pickStep(target)} />
              </div>
            )}

            {/*------ The Plates ------*/}
            {/* Every plate stays mounted (its fields and uploads keep their state); a step hides the others. */}
            {DOG_FORM_SECTIONS.map((section) => (
              <div
                key={section}
                hidden={stepMode && section !== currentSection}
                className={cn(
                  "ltr:[--df-dir:1] rtl:[--df-dir:-1]",
                  stepMode && shownStep.dir && `df-step-${shownStep.dir}`,
                )}
              >
                {plates[section]}
              </div>
            ))}

            {/*------ Actions ------*/}
            <div className="-mt-4 flex flex-col gap-4">
              {/* Directly above the buttons, where the eye is after pressing one; keyed so a new message rises in. */}
              {errors.root?.message && (
                <div key={errors.root.message} className="answer-in">
                  <FormAlert message={errors.root.message} />
                </div>
              )}

              {stepMode ? (
                <StepActions
                  step={currentStep}
                  saving={saveDog.isPending}
                  busy={busy}
                  onNext={goNext}
                  onSkip={() => void (lastStep ? onSubmit() : moveTo(currentStep + 1))}
                  onBack={() => void moveTo(currentStep - 1)}
                  cancel={
                    <Link
                      {...(redirectTo ? linkOptions({ to: ".", href: redirectTo }) : linkOptions({ to: "/account" }))}
                      className={buttonVariants({ variant: "ghost", size: "lg", className: "max-sm:px-3" })}
                    >
                      {m.account_dog_form_cancel()}
                    </Link>
                  }
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    variant="solid"
                    size="lg"
                    className="w-full sm:w-auto sm:min-w-48"
                    disabled={saveDog.isPending || busy}
                  >
                    {saveDog.isPending && <Spinner data-icon="inline-start" />}
                    {saveDog.isPending ? m.account_dog_form_saving_edit() : m.account_dog_form_submit_edit()}
                  </Button>
                  {/* Back where they came from: `redirectTo` (a built path, so `href`, which the router parses; `to`
                      is only there for the types), else the dog's page. */}
                  <Link
                    {...(redirectTo
                      ? linkOptions({ to: ".", href: redirectTo })
                      : dog
                        ? linkOptions({ to: "/account/dogs/$dogId", params: { dogId: dog.id } })
                        : linkOptions({ to: "/account" }))}
                    className={buttonVariants({ variant: "ghost", size: "lg" })}
                  >
                    {m.account_dog_form_cancel()}
                  </Link>
                </div>
              )}

              {busy && (
                <output className="answer-in block text-sm text-muted-foreground">{m.account_dog_form_busy()}</output>
              )}

              {/*------ The Path ------*/}
              {/* The form ends on a short stretch of path, a bush at each end; physical sides, a picture. */}
              <div aria-hidden className="pointer-events-none relative mt-2 h-16 sm:h-20">
                <GroundStrip className="absolute inset-x-0 bottom-0 h-8 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] sm:h-10" />
                <MascotCut
                  name="plants"
                  className="lively-sway absolute right-[3%] bottom-4 w-12 -scale-x-100 sm:w-16"
                />
                <MascotCut name="plants" className="lively-sway-2 absolute bottom-4 left-[3%] w-10 sm:w-14" />
              </div>
            </div>
          </form>
        </div>
      </div>
    </FormProvider>
  );
}

/*===== Step Actions =====*/
/**
 * A new dog's buttons under the plate: the one main action (`بعدی`, or on the last step the save), the quiet «بعداً»
 * on the optional steps (moves on, or saves as is on the last), and the way back (a step back, or «انصراف» on the
 * first). On phones the main action takes the full width and the other two share the row under it.
 */
function StepActions({
  step,
  saving,
  busy,
  onNext,
  onSkip,
  onBack,
  cancel,
}: {
  step: number;
  saving: boolean;
  busy: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  cancel: React.ReactNode;
}) {
  const last = step === DOG_FORM_STEP_COUNT;
  const skippable = sectionOfStep(step) === "health" || sectionOfStep(step) === "training";

  return (
    <div className="grid gap-3 sm:flex sm:items-center">
      {/* Keyed apart: the step change commits while the click that caused it is still being handled, and a reused
          node that turned into `type="submit"` would then save the form as the browser finishes the click. */}
      {last ? (
        <Button
          key="save"
          type="submit"
          variant="solid"
          size="lg"
          className="w-full sm:w-auto sm:min-w-48"
          disabled={saving || busy}
        >
          {saving && <Spinner data-icon="inline-start" />}
          {saving ? m.account_dog_form_saving_new() : m.account_dog_form_submit_new()}
        </Button>
      ) : (
        <Button
          key="next"
          type="button"
          variant="solid"
          size="lg"
          className="w-full sm:w-auto sm:min-w-48"
          onClick={onNext}
        >
          {m.account_dog_form_next()}
          {/* Points onward: left in Persian, right in English. */}
          <ChevronLeftIcon aria-hidden data-icon="inline-end" className="ltr:-scale-x-100" />
        </Button>
      )}

      <div className="flex items-center justify-between gap-2 sm:contents">
        {skippable && (
          <Button
            key={last ? "skip-save" : "skip"}
            type="button"
            variant="ghost"
            size="lg"
            className="max-sm:px-3"
            disabled={last && (saving || busy)}
            onClick={onSkip}
          >
            {last ? m.account_dog_form_skip_save() : m.account_dog_form_skip()}
          </Button>
        )}
        <div className="ms-auto">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="text-muted-foreground max-sm:px-3"
              onClick={onBack}
            >
              <ChevronRightIcon aria-hidden data-icon="inline-start" className="ltr:-scale-x-100" />
              {m.account_dog_form_back()}
            </Button>
          ) : (
            cancel
          )}
        </div>
      </div>
    </div>
  );
}

/*===== Redirect =====*/
/** `redirectTo` with `dog=<id>` added to its query; any query it already has is kept. `redirectTo` is a same-site path. */
function withDogParam({ redirectTo, dogId }: { redirectTo: string; dogId: string }) {
  const url = new URL(redirectTo, "http://localhost");
  url.searchParams.set("dog", dogId);
  return `${url.pathname}${url.search}${url.hash}`;
}
