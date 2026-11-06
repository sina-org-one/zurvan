import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { FormAlert } from "~/components/form-alert";
import { PartnerTermsText } from "~/components/partner-terms-text";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { orpc } from "~/orpc/client";
import { m } from "~/paraglide/messages";
import { PLATE } from "~/routes/account_partner/plate";

/*===== Terms Plate =====*/
/**
 * What a partner sees before anything else until he has accepted the terms in force: a partner the Admin added by
 * hand (who never saw the application form), and every partner after the wording changes. The tick and «قبول دارم»
 * record the acceptance (`partner.acceptTerms`); the server records the current version, never one the browser names.
 * Until then the dashboard holds back his link and QR, and the server refuses new customers.
 */
export function TermsPlate() {
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const accept = useMutation(
    orpc.partner.acceptTerms.mutationOptions({
      // The dashboard reads the profile with the link and QR, so it is fetched again rather than patched.
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.partner.getMine.key() }),
    }),
  );

  return (
    <section aria-labelledby="partner-terms-heading" className={`${PLATE} answer-in flex flex-col gap-5`}>
      <div>
        <h2 id="partner-terms-heading" className="font-display text-2xl font-bold text-balance">
          {m.account_partner_terms_title()}
        </h2>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">{m.account_partner_terms_lead()}</p>
      </div>

      <PartnerTermsText />

      <div className="flex items-start gap-3">
        <Checkbox
          id="partner-terms-agree"
          checked={agreed}
          onCheckedChange={(next) => setAgreed(next)}
          className="mt-1"
        />
        <Label htmlFor="partner-terms-agree" className="text-sm leading-relaxed font-medium text-pretty">
          {m.partner_terms_accept_label()}
        </Label>
      </div>

      <Button
        type="button"
        variant="solid"
        size="lg"
        className="sm:self-start"
        disabled={!agreed || accept.isPending}
        onClick={() => accept.mutate()}
      >
        {accept.isPending && <Spinner aria-hidden />}
        {m.account_partner_terms_accept()}
      </Button>

      <FormAlert message={accept.isError ? m.account_partner_terms_failed() : undefined} />
    </section>
  );
}
