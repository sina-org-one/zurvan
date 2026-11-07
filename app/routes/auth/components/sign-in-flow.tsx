import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";

import { DISPLAY_HEADING } from "~/lib/display-heading";
import { refreshSession } from "~/lib/session-guard";
import type { AuthStepName } from "~/routes/auth/auth-scenes";
import { CodeStep } from "~/routes/auth/components/code-step";
import { NameStep } from "~/routes/auth/components/name-step";
import { PasswordStep } from "~/routes/auth/components/password-step";
import { PhoneStep } from "~/routes/auth/components/phone-step";
import { m } from "~/paraglide/messages";

type Step =
  | { name: "phone" }
  | { name: "password"; phoneNumber: string }
  // `forgot`: the code was asked for because the password was forgotten, so signing in ends at the password card.
  | { name: "code"; phoneNumber: string; sentAt: number; forgot: boolean }
  | { name: "name" };

// The dog asks, so the questions are in its voice; the instructions under each stay plain. Functions, so each title is
// worded in the page's language when it renders.
const STEP_TITLES: Record<AuthStepName, () => string> = {
  phone: () => m.auth_step_phone_title(),
  password: () => m.auth_step_password_title(),
  code: () => m.auth_step_code_title(),
  name: () => m.auth_step_name_title(),
};

/*===== Sign-in Flow =====*/
/**
 * Phone → code → (first time only) name, or phone → password. Signing in and signing up are the same two steps (spec 2):
 * a number seen for the first time becomes a customer account when its code is verified, and only then is the name asked.
 * A password can only be set after that, from the profile page, so the password step is for people who already have an
 * account; one who forgot theirs takes the code step and is sent on to set a new one.
 *
 * The steps sit on one grained plate. A new step's title and form rise in (`answer-in` on a wrapper keyed by the step's
 * name; a resend keeps the name, so the code step doesn't replay), but not on the page's first paint: the form is there
 * from the start and only a move the person made animates.
 */
export function SignInFlow({
  asPartner,
  showcase,
  redirectTo,
  needsName,
  rulesPublished,
  onStepChange,
}: {
  /** «ورود همکار»: only a partner's number gets a code (`PhoneStep`). */
  asPartner: boolean;
  showcase: boolean;
  /** A same-site path (the page made sure), where the person goes once signed in. */
  redirectTo: string;
  /** Approved site rules exist, so the name step asks for the tick and records it (F13). */
  rulesPublished: boolean;
  /** Signed in already but never named (e.g. the tab closed after the code), so start at the name. */
  needsName: boolean;
  /** The page's stage follows the step (its dog and bubble), so every move to a new step is reported. */
  onStepChange: (step: AuthStepName) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(needsName ? { name: "name" } : { name: "phone" });
  // Kept when going back from the code or password step, so fixing one digit doesn't mean typing it all again.
  const [lastPhoneNumber, setLastPhoneNumber] = useState("");
  // Focus follows the person from step to step, but the page doesn't grab it on load.
  const [hasMoved, setHasMoved] = useState(false);
  const goTo = (next: Step) => {
    setHasMoved(true);
    setStep(next);
    onStepChange(next.name);
  };

  /**
   * Leaves for `redirectTo`, or, for someone who forgot their password and signed in with a code, for the profile's
   * password card where a new one is set.
   */
  async function finish({ forgot = false }: { forgot?: boolean } = {}) {
    // Drop anything cached for a previous account before showing this one's data, and ask for the new session before
    // the next page's guard reads it.
    queryClient.clear();
    await refreshSession(queryClient);
    if (forgot) await navigate({ to: "/account/profile", hash: "password" });
    else await navigate({ href: redirectTo });
  }

  return (
    <section
      aria-labelledby="sign-in-step-title"
      className="rounded-4xl border border-foreground/10 bg-card paper-grain p-5 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.9)] sm:p-7"
    >
      <div key={step.name} className={cn("flex flex-col gap-5", hasMoved && "answer-in")}>
        <h2 id="sign-in-step-title" className={`${DISPLAY_HEADING} text-2xl text-balance`}>
          {STEP_TITLES[step.name]()}
        </h2>

        {step.name === "phone" && (
          <PhoneStep
            defaultPhoneNumber={lastPhoneNumber}
            asPartner={asPartner}
            showcase={showcase}
            focusOnMount={hasMoved}
            onSent={(phoneNumber) => {
              setLastPhoneNumber(phoneNumber);
              goTo({ name: "code", phoneNumber, sentAt: Date.now(), forgot: false });
            }}
            onChoosePassword={(phoneNumber) => {
              setLastPhoneNumber(phoneNumber);
              goTo({ name: "password", phoneNumber });
            }}
          />
        )}

        {step.name === "password" && (
          <PasswordStep
            phoneNumber={step.phoneNumber}
            onEditPhone={() => goTo({ name: "phone" })}
            onUseCode={({ forgot }) =>
              goTo({ name: "code", phoneNumber: step.phoneNumber, sentAt: Date.now(), forgot })
            }
            onSignedIn={async (user) => {
              if (user.firstName) await finish();
              else goTo({ name: "name" });
            }}
          />
        )}

        {step.name === "code" && (
          <CodeStep
            phoneNumber={step.phoneNumber}
            sentAt={step.sentAt}
            showcase={showcase}
            onResent={(sentAt) => setStep({ ...step, sentAt })}
            onEditPhone={() => goTo({ name: "phone" })}
            onVerified={async (user) => {
              if (user.firstName) await finish({ forgot: step.forgot });
              else goTo({ name: "name" });
            }}
          />
        )}

        {step.name === "name" && (
          <NameStep focusOnMount={hasMoved} rulesPublished={rulesPublished} onDone={() => finish()} />
        )}
      </div>
    </section>
  );
}
