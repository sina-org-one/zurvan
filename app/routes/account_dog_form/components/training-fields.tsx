import { useFormContext } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { formatNumber } from "~/lib/locale-format";
import { DOG_MAX_BEHAVIOR_PROBLEMS, DOG_TRAINING_GOAL_LABELS, DOG_TRAINING_GOALS } from "~/orpc/dog/constants";
import { m } from "~/paraglide/messages";
import { ChoicePills } from "~/routes/account_dog_form/components/choice-pills";
import type { DogFormInput, DogFormValues } from "~/routes/account_dog_form/schema";

/*===== Training Fields =====*/
/**
 * What the training is for, all optional: the goals (several can be picked), the behavior problems, one per line (the
 * trainer sees them as a list above the dog's diary), and a note for the trainer.
 */
export function TrainingFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DogFormInput, unknown, DogFormValues>();

  return (
    <>
      <ChoicePills
        multiple
        legend={m.account_dog_form_field_goals()}
        description={m.account_dog_form_goals_hint()}
        options={DOG_TRAINING_GOALS.map((goal) => ({ value: goal, label: DOG_TRAINING_GOAL_LABELS[goal] }))}
        registration={register("trainingGoals")}
        error={errors.trainingGoals as { message?: string; type: string } | undefined}
      />

      <Field data-invalid={!!errors.behaviorProblems}>
        <FieldLabel htmlFor="dog-problems">
          {m.account_dog_form_field_problems()}{" "}
          <span className="font-medium text-muted-foreground">{m.account_dog_form_optional()}</span>
        </FieldLabel>
        <FieldDescription className="-mt-1">
          {m.account_dog_form_problems_hint({ max: formatNumber(DOG_MAX_BEHAVIOR_PROBLEMS) })}
        </FieldDescription>
        <Textarea
          id="dog-problems"
          rows={4}
          className="min-h-28"
          placeholder={m.account_dog_form_problems_placeholder()}
          aria-invalid={!!errors.behaviorProblems}
          {...register("behaviorProblems")}
        />
        <FieldError key={errors.behaviorProblems?.message} errors={[errors.behaviorProblems]} className="answer-in" />
      </Field>

      <Field data-invalid={!!errors.behaviorNotes}>
        <FieldLabel htmlFor="dog-behavior">
          {m.account_dog_form_field_behavior()}{" "}
          <span className="font-medium text-muted-foreground">{m.account_dog_form_optional()}</span>
        </FieldLabel>
        <Textarea
          id="dog-behavior"
          placeholder={m.account_dog_form_behavior_placeholder()}
          aria-invalid={!!errors.behaviorNotes}
          {...register("behaviorNotes")}
        />
        <FieldError key={errors.behaviorNotes?.message} errors={[errors.behaviorNotes]} className="answer-in" />
      </Field>
    </>
  );
}
