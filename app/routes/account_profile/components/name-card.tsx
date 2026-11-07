import { PenLineIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { m } from "~/paraglide/messages";
import type { CardVoiceProps } from "~/routes/account_profile/card-voice-props";
import { CardBubble } from "~/routes/account_profile/components/card-bubble";
import { CardHead } from "~/routes/account_profile/components/card-head";
import { EdgeDog } from "~/routes/account_profile/components/edge-dog";
import { RisingAlert } from "~/routes/account_profile/components/rising-alert";
import { SaveButton } from "~/routes/account_profile/components/save-button";
import { PLATE } from "~/routes/account_profile/plate";
import type { NameFormValues } from "~/routes/account_profile/schema";

/*===== Name Card =====*/
/**
 * «اسمت»: first and last name, saved on their own. The form's state lives in the page (`useNameForm`) so the tag can
 * follow what is typed; this is only the card. The `badge` dog stands on the plate's top edge with a blank name card in
 * his mouth, waiting to write the name on it. Focus anywhere inside hands him the word (`onEnter`).
 */
export function NameCard({
  form,
  onSubmit,
  isPending,
  isDirty,
  isSaved,
  voice,
  onEnter,
}: {
  form: UseFormReturn<NameFormValues>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isPending: boolean;
  isDirty: boolean;
  /** Just saved: the button says «ثبت شد» for a moment. */
  isSaved: boolean;
  voice: CardVoiceProps;
  onEnter: () => void;
}) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <section aria-labelledby="profile-name-title">
      <CardHead
        id="profile-name-title"
        title={m.account_profile_name_title()}
        figure={
          <EdgeDog name="badge" className="w-[5.25rem] sm:w-28">
            <CardBubble {...voice} className="bottom-[64%] left-[96%] sm:bottom-[58%] ltr:right-[96%] ltr:left-auto" />
          </EdgeDog>
        }
      />

      <div className={PLATE}>
        <p className="text-pretty text-muted-foreground">{m.account_profile_name_line()}</p>

        <form method="post" onSubmit={onSubmit} noValidate className="mt-6">
          {/* The listener sits on this wrapper, not the form or section: focus events bubble up to it from the fields,
              and the a11y lint rejects a handler on a landmark. */}
          <div className="flex flex-col gap-6" onFocus={onEnter}>
            <Field data-invalid={!!errors.firstName}>
              <FieldLabel htmlFor="profile-first-name">{m.account_profile_name_first_label()}</FieldLabel>
              <Input
                id="profile-first-name"
                autoComplete="given-name"
                aria-invalid={!!errors.firstName}
                {...register("firstName")}
              />
              <FieldError key={errors.firstName?.message} errors={[errors.firstName]} className="answer-in" />
            </Field>

            <Field data-invalid={!!errors.lastName}>
              <FieldLabel htmlFor="profile-last-name">{m.account_profile_name_last_label()}</FieldLabel>
              <Input
                id="profile-last-name"
                autoComplete="family-name"
                aria-invalid={!!errors.lastName}
                {...register("lastName")}
              />
              <FieldError key={errors.lastName?.message} errors={[errors.lastName]} className="answer-in" />
            </Field>

            <RisingAlert message={errors.root?.message} />

            <SaveButton
              label={m.account_profile_save()}
              icon={<PenLineIcon />}
              isPending={isPending}
              isSaved={isSaved}
              disabled={!isDirty}
            />
          </div>
        </form>
      </div>
    </section>
  );
}
