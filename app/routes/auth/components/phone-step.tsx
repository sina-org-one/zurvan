import { zodResolver } from "@hookform/resolvers/zod";
import { SmartphoneIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";
import { authClient } from "~/lib/auth-client";
import { client } from "~/orpc/client";
import { describeAuthError } from "~/routes/auth/auth-errors";
import { DemoAccounts } from "~/routes/auth/components/demo-accounts";
import { StepAlert } from "~/routes/auth/components/step-alert";
import { type PhoneInput, type PhoneValues, phoneSchema } from "~/routes/auth/schema";
import { m } from "~/paraglide/messages";

/*===== Phone Step =====*/
/**
 * Step one: the phone number. Sends the code and hands the normalized number on, or, for someone who has set a password,
 * hands it to the password step without sending anything. There is no separate sign-up: a number seen for the first
 * time becomes a new customer account once its code is verified.
 *
 * «ورود همکار» (`asPartner`) asks first whether the number is a partner's and sends no code when it isn't: verifying it
 * would make a customer account, and with one role per number that person could then never become a partner. They are
 * pointed to the application instead.
 */
export function PhoneStep({
  defaultPhoneNumber,
  asPartner,
  showcase,
  focusOnMount,
  onSent,
  onChoosePassword,
}: {
  defaultPhoneNumber: string;
  /** Signing in as a partner: only a partner's number gets a code. */
  asPartner: boolean;
  /** Coming back from the code step: the field takes focus. Not on page load, where the reader starts at the top. */
  focusOnMount: boolean;
  /** Shows the demo accounts under the form, each filling in its number. */
  showcase: boolean;
  onSent: (phoneNumber: string) => void;
  /** The person would rather type their password: nothing is sent, the number goes on to the password step. */
  onChoosePassword: (phoneNumber: string) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PhoneInput, unknown, PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: defaultPhoneNumber },
  });

  useEffect(() => {
    if (focusOnMount) setFocus("phoneNumber");
  }, [focusOnMount, setFocus]);

  /** In partner mode, refuses a number that isn't a partner's and says why. Returns whether to go on. */
  async function partnerMayGoOn(phoneNumber: string): Promise<boolean> {
    if (!asPartner) return true;
    try {
      const { isPartner } = await client.partner.isPartnerPhone({ phoneNumber });
      if (!isPartner) setError("root", { message: m.auth_partner_not_partner() });
      return isPartner;
    } catch {
      setError("root", { message: m.auth_partner_check_failed() });
      return false;
    }
  }

  const onSubmit = handleSubmit(async ({ phoneNumber }) => {
    if (!(await partnerMayGoOn(phoneNumber))) return;
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber });
    if (error) {
      setError("root", { message: describeAuthError(error) });
      return;
    }
    onSent(phoneNumber);
  });

  // The same number check as the code button, then the password step instead of an SMS.
  const choosePassword = handleSubmit(async ({ phoneNumber }) => {
    if (await partnerMayGoOn(phoneNumber)) onChoosePassword(phoneNumber);
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <StepAlert message={errors.root?.message} />

        <Field data-invalid={!!errors.phoneNumber}>
          <FieldLabel htmlFor="sign-in-phone">{m.auth_phone_label()}</FieldLabel>
          <InputGroup>
            {/* A gold chip, not a bare grey glyph: the number sits at the far (LTR) end, so a lone thin icon read as a
                stray mark. It lights up with the field. */}
            <InputGroupAddon className="pe-1">
              <span className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary/80 transition-colors group-focus-within/input-group:border-primary/50 group-focus-within/input-group:bg-primary/15 group-focus-within/input-group:text-primary">
                <SmartphoneIcon className="size-[1.15rem]" strokeWidth={2} aria-hidden />
              </span>
            </InputGroupAddon>
            <InputGroupInput
              id="sign-in-phone"
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={m.auth_phone_placeholder()}
              aria-invalid={!!errors.phoneNumber}
              aria-describedby="sign-in-phone-note"
              className="text-start text-lg tracking-wide sm:text-xl"
              {...register("phoneNumber")}
            />
          </InputGroup>
          <FieldDescription id="sign-in-phone-note">
            {asPartner ? m.auth_partner_phone_note() : m.auth_phone_note()}
          </FieldDescription>
          <FieldError errors={[errors.phoneNumber]} className="answer-in" />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {m.auth_phone_send()}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
          onClick={choosePassword}
        >
          {m.auth_phone_use_password()}
        </Button>

        {showcase && (
          <DemoAccounts
            onPick={(phoneNumber) => {
              setValue("phoneNumber", phoneNumber, { shouldValidate: true });
              setFocus("phoneNumber");
            }}
          />
        )}
      </FieldGroup>
    </form>
  );
}
