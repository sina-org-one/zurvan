import { ORPCError } from "@orpc/client";
import type { UseFormSetError } from "react-hook-form";

import { errorDataSchema } from "~/orpc/errors";
import { m } from "~/paraglide/messages";
import { type DogFormInput, SERVER_FIELD_TO_FORM } from "~/routes/account_dog_form/schema";

/*===== Form Fields =====*/
/** Server field names that are also form field names, so the server's message lands on the field of the same name. */
const FORM_FIELDS = new Set<string>([
  "photoMediaId",
  "name",
  "breedPurity",
  "breed",
  "breedSecondary",
  "sex",
  "isNeutered",
  "coatColor",
  "markings",
  "vaccinationStatus",
  "vaccinationNotes",
  "microchipNumber",
  "trainingGoals",
  "behaviorProblems",
  "behaviorNotes",
  "medicalNotes",
  "vaccinationPhotoIds",
  "medicalPhotoIds",
  "tattooPhotoIds",
]);

/** The locked fields (F2): an error on one of them means the dog was evaluated after the form opened. */
const LOCKED_FIELDS = ["birthDate", "breedPurity", "breed", "breedSecondary"];

/*===== Server Errors =====*/
/**
 * Puts the server's messages next to their fields, and anything else in the form-level alert. The two procedures
 * (`dog.create` and `dog.update`) share one mutation, so its error isn't typed per procedure; the shared error shape
 * is checked here instead. Never throws: every failure ends as a field error or as `root`.
 *
 * Returns the form fields that got a message (empty when only `root` did), so the form can tell which plate's dog
 * speaks the error line.
 */
export function applyServerError({
  error,
  setError,
}: {
  error: Error;
  setError: UseFormSetError<DogFormInput>;
}): (keyof DogFormInput)[] {
  const parsed = error instanceof ORPCError ? errorDataSchema.safeParse(error.data) : null;
  const code = error instanceof ORPCError ? error.code : null;

  if (code === "INVALID_INPUT" && parsed?.success) {
    const targets: (keyof DogFormInput)[] = [];
    for (const [path, message] of Object.entries(parsed.data.fields)) {
      // A list's item comes keyed by its place (`behaviorProblems.3`); it belongs to the list's field.
      const field = path.split(".")[0] ?? path;
      const target = SERVER_FIELD_TO_FORM[field] ?? (FORM_FIELDS.has(field) ? (field as keyof DogFormInput) : null);
      if (target && !targets.includes(target)) {
        setError(target, { message });
        targets.push(target);
      }
    }
    const [general] = parsed.data.errors;
    if (general) {
      setError("root", { message: general });
    } else if (LOCKED_FIELDS.some((field) => field in parsed.data.fields) && isLockedMessage(parsed.data.fields)) {
      // Only reachable when the dog was evaluated after this form opened, so the fields were still editable. The page
      // is stale, and the locked version shows after a refresh.
      setError("root", {
        message: m.account_dog_form_err_stale_lock(),
      });
    }
    return targets;
  }
  if (code === "UNAUTHORIZED") {
    setError("root", { message: m.account_dog_form_err_unauthorized() });
    return [];
  }
  if (code === "NOT_FOUND") {
    setError("root", { message: m.account_dog_form_err_not_found() });
    return [];
  }
  if (code === "INTERNAL_SERVER_ERROR") {
    const errorId = error instanceof ORPCError && typeof error.data?.errorId === "string" ? error.data.errorId : null;
    const failed = m.account_dog_form_err_internal();
    setError("root", {
      message: errorId ? `${failed} ${m.account_dog_form_err_internal_ref({ id: errorId })}` : failed,
    });
    return [];
  }
  setError("root", { message: m.account_dog_form_err_network() });
  return [];
}

/**
 * Whether the server refused a locked field for being locked (`server_dog_field_locked`), not for its value: only then
 * is the page stale. A cross with a missing second breed also errs on `breedSecondary`, and that is a plain field error.
 */
function isLockedMessage(fields: Record<string, string>): boolean {
  const locked = m.server_dog_field_locked();
  return LOCKED_FIELDS.some((field) => fields[field] === locked);
}
