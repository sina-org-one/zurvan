import { ORPCError } from "@orpc/client";
import type { UseFormSetError } from "react-hook-form";

import { errorDataSchema } from "~/orpc/errors";
import { m } from "~/paraglide/messages";
import { type AddLeadFormValues, LEAD_DETAIL_FIELDS } from "~/routes/account_partner_leads/schema";

/*===== Add Lead =====*/
/**
 * Puts the server's message next to its field (not a number, already has an account, already entered, a blank detail)
 * and anything else in the form-level alert (an inactive account, the terms not accepted). Never throws: every failure
 * ends as a field error or as `root`.
 */
export function applyAddLeadServerError({
  error,
  setError,
}: {
  error: Error;
  setError: UseFormSetError<AddLeadFormValues>;
}) {
  const code = error instanceof ORPCError ? error.code : null;
  const parsed = error instanceof ORPCError ? errorDataSchema.safeParse(error.data) : null;

  if (code === "INVALID_INPUT" && parsed?.success) {
    const { fields } = parsed.data;
    let placed = false;
    for (const name of ["phoneNumber", ...LEAD_DETAIL_FIELDS] as const) {
      const message = fields[name];
      if (message) {
        setError(name, { message });
        placed = true;
      }
    }
    const [general] = parsed.data.errors;
    if (general) setError("root", { message: general });
    if (!placed && !general) setError("root", { message: m.account_partner_leads_error_not_saved() });
    return;
  }
  if (code === "UNAUTHORIZED") {
    setError("root", { message: m.account_partner_leads_error_signed_out() });
    return;
  }
  if (code === "FORBIDDEN" || code === "NOT_FOUND") {
    setError("root", {
      message: m.account_partner_leads_error_forbidden(),
    });
    return;
  }
  if (code === "INTERNAL_SERVER_ERROR") {
    const errorId = error instanceof ORPCError && typeof error.data?.errorId === "string" ? error.data.errorId : null;
    setError("root", {
      message: errorId
        ? m.account_partner_leads_error_internal_with_id({ errorId })
        : m.account_partner_leads_error_internal(),
    });
    return;
  }
  setError("root", { message: m.account_partner_leads_error_network() });
}
