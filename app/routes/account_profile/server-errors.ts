import { ORPCError } from "@orpc/client";
import type { UseFormSetError } from "react-hook-form";

import { errorDataSchema } from "~/orpc/errors";
import { m } from "~/paraglide/messages";
import type { PasswordFormValues, ShebaFormInput } from "~/routes/account_profile/schema";

/*===== Better-Auth =====*/
/** Why saving the name failed, in words that say what to do next. Better-Auth's own messages are English. */
export function describeNameError(error: { status?: number } | null): string {
  if (error?.status === 401) return m.account_profile_error_signed_out();
  if (error?.status === 429) return m.account_profile_error_too_many();
  return m.account_profile_error_network();
}

/*===== Sheba =====*/
/**
 * Puts the server's message next to the Sheba field and anything else in the form-level alert. Never throws: every
 * failure ends as a field error or as `root`.
 */
export function applyShebaServerError({
  error,
  setError,
}: {
  error: Error;
  setError: UseFormSetError<ShebaFormInput>;
}) {
  const code = error instanceof ORPCError ? error.code : null;
  const parsed = error instanceof ORPCError ? errorDataSchema.safeParse(error.data) : null;

  if (code === "INVALID_INPUT" && parsed?.success) {
    const message = parsed.data.fields.shebaNumber;
    if (message) setError("shebaNumber", { message });
    const [general] = parsed.data.errors;
    if (general) setError("root", { message: general });
    if (!message && !general) setError("root", { message: m.account_profile_error_sheba_check() });
    return;
  }
  if (code === "UNAUTHORIZED") {
    setError("root", { message: m.account_profile_error_signed_out() });
    return;
  }
  if (code === "FORBIDDEN" || code === "NOT_FOUND") {
    setError("root", {
      message: m.account_profile_error_sheba_forbidden(),
    });
    return;
  }
  if (code === "INTERNAL_SERVER_ERROR") {
    const errorId = error instanceof ORPCError && typeof error.data?.errorId === "string" ? error.data.errorId : null;
    setError("root", {
      message: errorId ? m.account_profile_error_internal_ref({ id: errorId }) : m.account_profile_error_internal(),
    });
    return;
  }
  setError("root", { message: m.account_profile_error_network() });
}

/*===== Password =====*/
/** The code `password.set` answers with when the session is too old to change the password (see `PASSWORD_CHANGE_FRESH_MINUTES`). */
export const SESSION_TOO_OLD_CODE = "SESSION_TOO_OLD";

/**
 * Puts the server's reason next to the new-password field and anything else in the form-level alert. A session that is
 * too old is told apart by `isSessionTooOld` in the form, which offers the way out (sign in again); this only words it.
 */
export function applyPasswordServerError({
  error,
  setError,
}: {
  error: Error;
  setError: UseFormSetError<PasswordFormValues>;
}) {
  const code = error instanceof ORPCError ? error.code : null;
  const parsed = error instanceof ORPCError ? errorDataSchema.safeParse(error.data) : null;

  if (code === "INVALID_INPUT" && parsed?.success) {
    const message = parsed.data.fields.newPassword;
    if (message) setError("newPassword", { message });
    const [general] = parsed.data.errors;
    if (general) setError("root", { message: general });
    if (!message && !general) setError("root", { message: m.account_profile_error_password_check() });
    return;
  }
  if (code === SESSION_TOO_OLD_CODE) {
    setError("root", {
      message: m.account_profile_error_session_too_old(),
    });
    return;
  }
  if (code === "UNAUTHORIZED") {
    setError("root", { message: m.account_profile_error_signed_out() });
    return;
  }
  if (code === "INTERNAL_SERVER_ERROR") {
    const errorId = error instanceof ORPCError && typeof error.data?.errorId === "string" ? error.data.errorId : null;
    setError("root", {
      message: errorId ? m.account_profile_error_internal_ref({ id: errorId }) : m.account_profile_error_internal(),
    });
    return;
  }
  setError("root", { message: m.account_profile_error_network() });
}
