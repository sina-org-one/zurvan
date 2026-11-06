import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { BrandLogo } from "~/components/brand-logo";
import { LanguageSwitch } from "~/components/language-switch";
import { Link } from "~/components/link";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { localizedPath } from "~/lib/i18n";
import { pageHead } from "~/lib/seo";
import { SITE_RULES } from "~/lib/site-rules";
import { orpc } from "~/orpc/client";
import { m } from "~/paraglide/messages";
import type { AuthStepName } from "~/routes/auth/auth-scenes";
import { AuthStage } from "~/routes/auth/components/auth-stage";
import { SignInFlow } from "~/routes/auth/components/sign-in-flow";
import { TrustNote } from "~/routes/auth/components/trust-note";

/** The language switch's look in both its places: a quiet link, like the account shell's. */
const SWITCH_LINK =
  "rounded px-1 py-1 text-sm text-foreground/70 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/** Where people land after signing in when nothing asked for a page. The account area sends each role on from there. */
const DEFAULT_REDIRECT = "/account";

/*===== Search =====*/
// `redirectTo`: the page to return to after signing in (the guards and sign-out send it). A partner's `?ref=` code is
// remembered by the server before the page renders (`app/start.ts`), so the page itself doesn't read it. `as`: which
// door, «ورود مشتری» (the default) or «ورود همکار» (`partner`), chosen by the switch at the top of the form.
const authSearchSchema = z.object({
  redirectTo: z.string().optional().catch(undefined),
  as: z.enum(["customer", "partner"]).optional().catch(undefined),
});

/*===== Route =====*/
export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  // Signed-in people have nothing to do here, unless their new account still has no name. A blocked account's
  // sessions are revoked on the way, so it reads as signed out and starts again at the phone step.
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const session = await queryClient.ensureQueryData(orpc.session.get.queryOptions());
    // `redirectTo` is an internal path; a redirect's `href` skips the router's rewrite, so it is put in the page's
    // language here (`/en/account` for someone signing in on the English site).
    if (session.status === "active") {
      throw redirect({ href: localizedPath({ path: safeRedirect(search.redirectTo) }) });
    }
  },
  // What the page starts from, kept as the loader's answer rather than read from the cache: signing in clears the cache
  // (`SignInFlow`), and the page must not lose its footing while it navigates on.
  loader: async ({ context: { queryClient } }) => {
    const [session, site] = await Promise.all([
      queryClient.ensureQueryData(orpc.session.get.queryOptions()),
      queryClient.ensureQueryData(orpc.site.config.queryOptions()),
    ]);
    return {
      showcase: site.showcase,
      needsName: session.status === "unnamed",
      // The name step asks for the tick only when approved rules exist (F13).
      rulesPublished: SITE_RULES !== null,
    };
  },
  head: () => pageHead({ path: "/auth", title: m.auth_meta_title(), description: m.auth_meta_description() }),
  component: AuthPage,
});

/** Only same-site paths, so a crafted `?redirectTo=` link can't send someone to another site after signing in. */
function safeRedirect(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : DEFAULT_REDIRECT;
}

/*===== Door Switch =====*/
/**
 * «ورود مشتری» and «ورود همکار», two pills over the welcome. They change only `?as=` (and keep `redirectTo`), so the
 * same page and flow serve both: a customer signs in or up as before; a partner signs in only with a partner's number.
 */
function DoorSwitch({ asPartner, redirectTo }: { asPartner: boolean; redirectTo: string | undefined }) {
  const pill =
    "inline-flex h-10 items-center rounded-full px-4 text-sm font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  const on = "bg-primary text-primary-foreground";
  const off = "text-foreground/75 hover:text-foreground";

  return (
    <nav
      aria-label={m.auth_door_label()}
      className="mb-5 inline-flex rounded-full border border-foreground/15 bg-card p-1"
    >
      <Link
        to="/auth"
        search={{ redirectTo, as: undefined }}
        replace
        aria-current={!asPartner ? "page" : undefined}
        className={`${pill} ${asPartner ? off : on}`}
      >
        {m.auth_door_customer()}
      </Link>
      <Link
        to="/auth"
        search={{ redirectTo, as: "partner" }}
        replace
        aria-current={asPartner ? "page" : undefined}
        className={`${pill} ${asPartner ? on : off}`}
      >
        {m.auth_door_partner()}
      </Link>
    </nav>
  );
}

/*===== Page =====*/
/**
 * The dog meets you at the door. The form is one grained plate on the paper, and the page's other half is a drawn night
 * scene (`AuthStage`): a front door with its lamp lit, and at each step a different dog waiting on the doorstep who asks
 * that step's question.
 *
 * Outside the storefront shell (no header, footer or tab bar). Desktop: one full-viewport band split in two; in RTL the
 * first column is the right one, so the form comes first in the DOM and sits on the start side, and the stage is the
 * left half. Phones: the stage is a band on top (moved first by `order`, so the form keeps the first place in the tab
 * order) with the logo laid over its start corner (in English, above the welcome), and the plate follows.
 *
 * The language switch (outside any shell, so the page draws its own): on desktop at the end of the logo's row, on phones
 * after the trust note, where the shells' footers have it. A partner's QR code lands a visitor here first, so someone who
 * can't read the page must find theirs.
 */
function AuthPage() {
  const { showcase, needsName, rulesPublished } = Route.useLoaderData();
  const search = Route.useSearch();
  const redirectTo = safeRedirect(search.redirectTo);
  // A new account can't be named in partner mode (only a partner's number gets a code), so the name step is a customer's.
  const asPartner = search.as === "partner" && !needsName;
  // Which dog is up follows the flow's step; the flow reports each change.
  const firstStep: AuthStepName = needsName ? "name" : "phone";
  const [step, setStep] = useState<AuthStepName>(firstStep);

  return (
    <main className="relative isolate flex min-h-svh flex-col bg-jet lg:grid lg:h-svh lg:grid-cols-2 lg:overflow-hidden">
      {/*===== Form Column =====*/}
      {/* Scrolls on its own on desktop, so the demo list never moves the stage. Its scrollbar is hidden; the wheel and touch still scroll it. */}
      <div className="z-10 [scrollbar-width:none] px-4 pt-6 pb-12 sm:px-6 lg:h-svh lg:overflow-y-auto lg:px-10 lg:pt-8 [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-full max-w-md flex-col lg:min-h-full">
          {/*------ Logo ------*/}
          {/* Phones: laid over the stage band's top start corner (the row is empty there, its logo out of flow); in
              English it stays in the flow above the welcome instead, since the drawn scene keeps its sides and the
              dog's bubble fills the top left, and the Latin wordmark is wider. Desktop: first in the column, scrolling
              with it, with the language switch at the row's end. */}
          <div className="lg:mb-10 lg:flex lg:items-center lg:justify-between lg:gap-4">
            <Link
              to="/"
              aria-label={m.auth_logo_label()}
              className="absolute start-4 top-5 z-20 self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:start-6 lg:static ltr:max-lg:static ltr:max-lg:inline-flex"
            >
              <BrandLogo />
            </Link>
            <LanguageSwitch className={`hidden lg:inline-flex ${SWITCH_LINK}`} />
          </div>

          <div className="flex flex-col max-lg:pt-7 lg:my-auto">
            {/*------ Welcome ------*/}
            <header>
              {!needsName && <DoorSwitch asPartner={asPartner} redirectTo={search.redirectTo} />}
              <h1 className={`${DISPLAY_HEADING} text-h1 text-balance`}>
                {asPartner ? m.auth_partner_welcome_lead() : m.auth_welcome_lead()}{" "}
                <span className="text-primary">
                  {asPartner ? m.auth_partner_welcome_accent() : m.auth_welcome_accent()}
                </span>
              </h1>
              <p className="mt-3 text-pretty text-muted-foreground">
                {asPartner ? (
                  <>
                    {m.auth_partner_welcome_note()}{" "}
                    <Link
                      to="/join/partner"
                      hash="apply"
                      className="font-bold text-primary underline-offset-4 hover:underline"
                    >
                      {m.auth_partner_apply_link()}
                    </Link>
                  </>
                ) : (
                  m.auth_welcome_note()
                )}
              </p>
            </header>

            {/*------ Steps ------*/}
            <div className="mt-6 lg:mt-8">
              <SignInFlow
                // A new flow for the other door, so a half-typed number or an error doesn't carry across.
                key={asPartner ? "partner" : "customer"}
                asPartner={asPartner}
                showcase={showcase}
                redirectTo={redirectTo}
                needsName={needsName}
                rulesPublished={rulesPublished}
                onStepChange={setStep}
              />
            </div>

            {/*------ Reassurance ------*/}
            <div className="mt-7">
              <TrustNote />
            </div>

            {/*------ Language (phones) ------*/}
            <LanguageSwitch className={`mt-8 self-center lg:hidden ${SWITCH_LINK}`} />
          </div>
        </div>
      </div>

      {/*===== Stage =====*/}
      <AuthStage step={step} firstStep={firstStep} />
    </main>
  );
}
