import { zodResolver } from "@hookform/resolvers/zod";
import { ORPCError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { FileTextIcon, PaperclipIcon, SendIcon, XIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { ChalkBubble } from "~/components/chalk-bubble";
import { FormAlert } from "~/components/form-alert";
import { MascotCut } from "~/components/mascot-cut";
import { PartnerTermsText } from "~/components/partner-terms-text";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatNumber } from "~/lib/locale-format";
import { PARTNER_BUSINESS_TYPES, partnerBusinessTypeLabel } from "~/lib/partner-terms";
import { orpc } from "~/orpc/client";
import { errorDataSchema } from "~/orpc/errors";
import {
  PARTNER_DOCUMENT_ACCEPT,
  PARTNER_DOCUMENT_MAX,
  PARTNER_DOCUMENT_MAX_BYTES,
} from "~/orpc/partner_application/documents";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/join_partner/column";
import { type ApplyFormValues, EMPTY_APPLICATION, applyFormSchema } from "~/routes/join_partner/schema";

/*===== Constants =====*/
const TEXT_FIELDS = ["firstName", "lastName", "businessName"] as const;
const FIELD_NAMES = [
  "firstName",
  "lastName",
  "phoneNumber",
  "businessName",
  "businessType",
  "address",
  "marketerName",
  "note",
  "acceptTerms",
  "documents",
] as const;

/** «۲٫۴ مگابایت» / "2.4 MB": a chosen file's size, so a too-big one is easy to spot. */
function formatMegabytes(bytes: number): string {
  return m.join_partner_apply_documents_size({ size: formatNumber(Math.round((bytes / 1024 / 1024) * 10) / 10) });
}

function textLabel(field: (typeof TEXT_FIELDS)[number]): string {
  switch (field) {
    case "firstName":
      return m.join_partner_apply_first_name();
    case "lastName":
      return m.join_partner_apply_last_name();
    case "businessName":
      return m.join_partner_apply_business_name();
  }
}

/*===== Apply Form =====*/
/**
 * «درخواست همکاری» (the owner, 2026-11-06): a clinic, groomer, pet shop or kennel applies here with their own and their
 * business's details, alone or with a marketer who visited them (his name is an optional field). The partnership terms
 * are on the form in a scrolling box and the tick is required; the server records the version they accepted. The Admin
 * reviews the application on the Partners page and approves it (which creates the account) or rejects it, and the
 * applicant gets an SMS either way. Anyone may apply, signed in or not.
 *
 * After sending, the plate turns into the celebrating dog and what happens next.
 */
export function ApplyForm() {
  const apply = useMutation(orpc.partnerApplication.submit.mutationOptions());
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ApplyFormValues>({ resolver: zodResolver(applyFormSchema), defaultValues: EMPTY_APPLICATION });

  /*------ Submit ------*/
  const onSubmit = handleSubmit((values) => {
    apply.mutate(values, {
      onError: (error) => {
        const parsed = error instanceof ORPCError ? errorDataSchema.safeParse(error.data) : null;
        if (error instanceof ORPCError && error.code === "INVALID_INPUT" && parsed?.success) {
          let placed = false;
          for (const name of FIELD_NAMES) {
            const message = parsed.data.fields[name];
            if (message) {
              setError(name, { message });
              placed = true;
            }
          }
          const [general] = parsed.data.errors;
          if (general || !placed) setError("root", { message: general ?? m.join_partner_apply_failed() });
          return;
        }
        setError("root", { message: m.join_partner_apply_failed() });
      },
    });
  });

  return (
    <section id="apply" aria-labelledby="apply-title" className={`${COLUMN} scroll-mt-24 pt-section-sm`}>
      <div className="relative rounded-4xl border border-border bg-card paper-grain px-5 py-8 shadow-sm sm:px-10 sm:py-10 lg:px-14">
        {apply.isSuccess ? (
          /*===== Sent =====*/
          <div className="answer-in flex flex-col items-center gap-5 py-6 text-center" aria-live="polite">
            <div className="relative">
              <MascotCut name="celebrate" className="lively-hop relative block h-36 w-auto" />
              <div className="absolute start-[70%] bottom-[90%]">
                <ChalkBubble tail="start" className="w-max max-w-[12rem] text-pretty">
                  {m.join_partner_apply_sent_bubble()}
                </ChalkBubble>
              </div>
            </div>
            <h2 id="apply-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
              {m.join_partner_apply_sent_title()}
            </h2>
            <p className="max-w-lg text-pretty text-muted-foreground">{m.join_partner_apply_sent_line()}</p>
          </div>
        ) : (
          <>
            {/*===== Heading =====*/}
            <div className="max-w-2xl">
              <h2 id="apply-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
                {m.join_partner_apply_title()}
              </h2>
              <p className="mt-3 text-pretty text-muted-foreground">{m.join_partner_apply_line()}</p>
            </div>

            {/*===== The Form =====*/}
            <form method="post" onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
              {/*------ About You and the Business ------*/}
              <div className="grid gap-5 sm:grid-cols-2">
                {TEXT_FIELDS.map((name) => (
                  <Field key={name} data-invalid={!!errors[name]}>
                    <FieldLabel htmlFor={`apply-${name}`}>{textLabel(name)}</FieldLabel>
                    <Input
                      id={`apply-${name}`}
                      autoComplete={
                        name === "firstName" ? "given-name" : name === "lastName" ? "family-name" : "organization"
                      }
                      aria-invalid={!!errors[name]}
                      {...register(name)}
                    />
                    <FieldError errors={[errors[name]]} />
                  </Field>
                ))}

                <Field data-invalid={!!errors.phoneNumber}>
                  <FieldLabel htmlFor="apply-phone">{m.join_partner_apply_phone()}</FieldLabel>
                  <Input
                    id="apply-phone"
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={m.join_partner_apply_phone_placeholder()}
                    className="tabular-nums"
                    aria-invalid={!!errors.phoneNumber}
                    {...register("phoneNumber")}
                  />
                  <FieldDescription>{m.join_partner_apply_phone_hint()}</FieldDescription>
                  <FieldError errors={[errors.phoneNumber]} />
                </Field>

                <Field data-invalid={!!errors.businessType}>
                  <FieldLabel htmlFor="apply-type">{m.join_partner_apply_business_type()}</FieldLabel>
                  <NativeSelect
                    id="apply-type"
                    className="w-full"
                    aria-invalid={!!errors.businessType}
                    {...register("businessType")}
                  >
                    <NativeSelectOption value="">{m.join_partner_apply_business_type_pick()}</NativeSelectOption>
                    {PARTNER_BUSINESS_TYPES.map((type) => (
                      <NativeSelectOption key={type} value={type}>
                        {partnerBusinessTypeLabel(type)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[errors.businessType]} />
                </Field>

                <Field data-invalid={!!errors.marketerName}>
                  <FieldLabel htmlFor="apply-marketer">{m.join_partner_apply_marketer()}</FieldLabel>
                  <Input id="apply-marketer" autoComplete="off" {...register("marketerName")} />
                  <FieldDescription>{m.join_partner_apply_marketer_hint()}</FieldDescription>
                  <FieldError errors={[errors.marketerName]} />
                </Field>

                <Field data-invalid={!!errors.address} className="sm:col-span-2">
                  <FieldLabel htmlFor="apply-address">{m.join_partner_apply_address()}</FieldLabel>
                  <Input
                    id="apply-address"
                    autoComplete="street-address"
                    placeholder={m.join_partner_apply_address_placeholder()}
                    aria-invalid={!!errors.address}
                    {...register("address")}
                  />
                  <FieldError errors={[errors.address]} />
                </Field>

                <Field data-invalid={!!errors.note} className="sm:col-span-2">
                  <FieldLabel htmlFor="apply-note">{m.join_partner_apply_note()}</FieldLabel>
                  <Textarea
                    id="apply-note"
                    placeholder={m.join_partner_apply_note_placeholder()}
                    className="min-h-24"
                    {...register("note")}
                  />
                  <FieldError errors={[errors.note]} />
                </Field>
              </div>

              {/*------ The Papers ------*/}
              {/* At least one: a licence, a vet's permit, a photo of the shopfront. Kept private, for the Admin only. */}
              <Controller
                control={control}
                name="documents"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error}>
                    <FieldLabel htmlFor="apply-documents">{m.join_partner_apply_documents()}</FieldLabel>
                    <FieldDescription>
                      {m.join_partner_apply_documents_hint({
                        count: formatNumber(PARTNER_DOCUMENT_MAX),
                        megabytes: formatNumber(PARTNER_DOCUMENT_MAX_BYTES / 1024 / 1024),
                      })}
                    </FieldDescription>
                    {field.value.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {field.value.map((file, index) => (
                          <li
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="flex items-center gap-3 rounded-xl border border-foreground/15 bg-background/40 px-3 py-2 text-sm"
                          >
                            <FileTextIcon aria-hidden className="size-4 shrink-0 text-primary" />
                            <bdi className="min-w-0 flex-1 truncate">{file.name}</bdi>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {formatMegabytes(file.size)}
                            </span>
                            <button
                              type="button"
                              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                              aria-label={m.join_partner_apply_documents_remove({ name: file.name })}
                              onClick={() => field.onChange(field.value.filter((_, at) => at !== index))}
                            >
                              <XIcon aria-hidden className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {field.value.length < PARTNER_DOCUMENT_MAX && (
                      <label
                        htmlFor="apply-documents"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground/20 px-4 py-4 text-sm font-bold text-foreground/85 transition-colors hover:border-primary/60 hover:text-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
                      >
                        <PaperclipIcon aria-hidden className="size-4 text-primary" />
                        {m.join_partner_apply_documents_pick()}
                        <input
                          id="apply-documents"
                          type="file"
                          multiple
                          accept={PARTNER_DOCUMENT_ACCEPT}
                          className="sr-only"
                          aria-invalid={!!fieldState.error}
                          onChange={(event) => {
                            const picked = [...(event.target.files ?? [])];
                            // The same input picks again later, so it is emptied after each pick.
                            event.target.value = "";
                            field.onChange([...field.value, ...picked].slice(0, PARTNER_DOCUMENT_MAX));
                          }}
                        />
                      </label>
                    )}
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {/*------ The Terms ------*/}
              <PartnerTermsText />
              <Controller
                control={control}
                name="acceptTerms"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="apply-terms"
                        checked={field.value}
                        onCheckedChange={(next) => field.onChange(next)}
                        aria-invalid={!!fieldState.error}
                        className="mt-1"
                      />
                      <Label htmlFor="apply-terms" className="text-sm leading-relaxed font-medium text-pretty">
                        {m.partner_terms_accept_label()}
                      </Label>
                    </div>
                    <FieldError errors={[fieldState.error]} />
                  </div>
                )}
              />

              {/*------ Send ------*/}
              <FormAlert message={errors.root?.message} />
              <Button
                type="submit"
                variant="solid"
                size="lg"
                className="sm:self-start sm:px-10"
                disabled={apply.isPending}
              >
                {apply.isPending ? <Spinner aria-hidden /> : <SendIcon aria-hidden className="size-4" />}
                {apply.isPending ? m.join_partner_apply_sending() : m.join_partner_apply_submit()}
              </Button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
