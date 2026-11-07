import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { CircleAlertIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { CommissionStairs } from "~/components/commission-stairs";
import { FormAlert } from "~/components/form-alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { useAdminAction } from "~/hooks/use-admin-action";
import { ADMIN_HAIRLINE, ADMIN_PLATE, ADMIN_TEAR } from "~/lib/admin-plate";
import { calculateCommission, commissionPercentFor, type CommissionTier } from "~/lib/business-rules";
import { formatToman } from "~/lib/course-format";
import { formatNumberFa, toLatinDigits, toPersianDigits } from "~/lib/digits";
import { formatJalaliTimestamp } from "~/lib/jalali";
import { client } from "~/orpc/client";
import type { AdminCommissionTiers } from "~/orpc/setting/contract";
import { PopText } from "~/routes/admin_settings/components/pop-text";
import {
  commissionTiersFormSchema,
  type CommissionTiersFormInput,
  type CommissionTiersFormValues,
} from "~/routes/admin_settings/schema";
import { EXAMPLE_SALE_RIAL } from "~/routes/admin_settings/setting-copy";

/*===== Constants =====*/
// The number plates' columns, tear and notch (setting-plate.tsx), so this plate reads as one of them.
const COLUMNS = "xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]";
const TEAR_AT = "start-[calc(5/11*100%)]";
const NOTCH_AT = "start-[calc(5/11*100%-0.625rem)]";
const NOTCH = "pointer-events-none absolute size-5 rounded-full border border-foreground/10 bg-background paper-grain";
const INK_OUTLINE =
  "border-foreground/15 bg-transparent hover:bg-foreground/5 dark:border-foreground/15 dark:bg-transparent";

/** The small number fields of a step. */
const STEP_FIELD =
  "h-11 w-16 rounded-xl text-center font-display text-xl font-extrabold tabular-nums sm:w-20 md:text-xl";

const NOTES = [
  "همیشه پنج پله‌ست. برای پله‌ی کمتر، به پله‌های بالایی همون درصد رو بده؛ همکار اون‌ها رو یه پله می‌بینه.",
  "مشتری‌ها از اول همکاری شمرده می‌شن و هیچ‌وقت صفر نمی‌شن؛ هر مشتری فقط یه بار، با اولین خریدش.",
  "خرید دوباره‌ی یه مشتری قدیمی هم هدیه‌ی معرفی داره، با درصد پله‌ای که همکار اون روز روشه.",
  "فقط روی هدیه‌های معرفی بعدی اثر داره؛ هدیه‌ای که نوشته شده درصد روز خریدش رو نگه می‌داره.",
  "همین پله‌ها توی صفحه‌ی همکاری با ما و داشبورد خود همکار دیده می‌شن.",
];

/** What he types is shown in Persian digits whatever his keyboard; the schema reads every kind. */
const toShown = (raw: string) => toPersianDigits(toLatinDigits(raw));

const toFormTiers = (tiers: readonly CommissionTier[]): CommissionTiersFormInput["tiers"] =>
  tiers.map((tier) => ({ fromCustomer: toShown(String(tier.fromCustomer)), percent: toShown(String(tier.percent)) }));

const sameTiers = (a: readonly CommissionTier[], b: readonly CommissionTier[]) =>
  a.length === b.length &&
  a.every((tier, index) => tier.fromCustomer === b[index]?.fromCustomer && tier.percent === b[index]?.percent);

/*===== Commission Tiers Plate =====*/
/**
 * The partners' commission steps (F7, F10) as one plate torn like the number plates: at the start what the steps do;
 * at the end the five steps, one line each («از مشتری [۴] ← [۱۲] ٪», the first fixed at customer 1; no adding or
 * removing, the owner's rule: fewer steps is the same percent on the top ones), and under them the same staircase the
 * partners see (steps sharing a percent drawn as one), redrawn on every keystroke with one worked example. Steps that can't be
 * saved replace the example with the reason, so the line under the stairs never says two things.
 *
 * Saves the whole table at once. «ذخیره» is an ink outline until the table differs from the saved one, then the
 * plate's one gold button. «برگردوندن به پیش‌فرض» fills in the default steps and does not save.
 */
export function CommissionTiersPlate({ setting, busy }: { setting: AdminCommissionTiers; busy: boolean }) {
  const fieldId = "setting-commission-tiers";
  const messageId = `${fieldId}-message`;

  /*------ Form ------*/
  const { register, control, handleSubmit, reset } = useForm<
    CommissionTiersFormInput,
    unknown,
    CommissionTiersFormValues
  >({
    resolver: zodResolver(commissionTiersFormSchema),
    mode: "onChange",
    defaultValues: { tiers: toFormTiers(setting.tiers) },
  });
  const { fields, replace } = useFieldArray({ control, name: "tiers" });

  /*------ Save ------*/
  const [stamp, setStamp] = useState(0);
  const save = useAdminAction({
    mutationFn: (tiers: CommissionTier[]) => client.setting.admin.updateCommissionTiers({ tiers }),
    success: "ذخیره شد",
    toastFailure: false,
    failureFallback: "ذخیره نشد. دوباره امتحان کن.",
    onSuccess: () => setStamp((count) => count + 1),
  });
  const touch = () => {
    save.reset();
    setStamp(0);
  };

  // After a save the refetched steps are the stored ones: the fields follow them, and show them as unchanged.
  const savedKey = JSON.stringify(setting.tiers);
  useEffect(() => {
    reset({ tiers: toFormTiers(setting.tiers) });
    // `savedKey` stands for `setting.tiers`, which is a new array on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, savedKey]);

  /*------ Live Value ------*/
  // The stairs, the example, «ذخیره» and the reset all read the same parse of what is typed right now.
  const typed = useWatch({ control, name: "tiers" });
  const parsed = commissionTiersFormSchema.safeParse({ tiers: typed });
  const tiers = parsed.success ? parsed.data.tiers : null;
  const isChanged = tiers !== null && !sameTiers(tiers, setting.tiers);
  const isDefault = tiers !== null && sameTiers(tiers, setting.defaultTiers);

  // A local problem wins; a refusal from the server stays until he types again.
  const errorMessage = parsed.success ? save.failure?.fields.tiers : parsed.error.issues[0]?.message;
  const alertMessage = save.failure?.message ?? undefined;

  const onSubmit = handleSubmit(({ tiers: values }) => {
    if (save.isPending || sameTiers(values, setting.tiers)) return;
    save.run(values);
  });

  /*------ Field Typing ------*/
  // Persian digits as he types, with the caret where it was (each digit stays one character).
  const typedDigits = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const shown = toShown(input.value);
    if (shown !== input.value) {
      const caret = input.selectionStart;
      input.value = shown;
      if (caret !== null) input.setSelectionRange(caret, caret);
    }
    touch();
  };

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      aria-busy={busy}
      className={cn(ADMIN_PLATE, "relative grid overflow-hidden transition-opacity", COLUMNS, busy && "opacity-60")}
    >
      <span aria-hidden className={cn("absolute inset-y-0 hidden border-s xl:block", ADMIN_TEAR, TEAR_AT)} />
      <span aria-hidden className={cn(NOTCH, NOTCH_AT, "-top-2.5 hidden xl:block")} />
      <span aria-hidden className={cn(NOTCH, NOTCH_AT, "-bottom-2.5 hidden xl:block")} />

      {/*===== Words =====*/}
      <div className="p-5 xl:p-6">
        <h3 id={fieldId} className="text-base font-bold">
          پله‌های هدیه‌ی معرفی همکار
        </h3>
        <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
          هر خرید مشتری‌ای که همکار آورده هدیه‌ی معرفی داره. درصدش با تعداد مشتری‌های خریدار همکار بالا می‌ره: مشتری
          چندمِ همکار باشه، درصد همون پله رو می‌گیره.
        </p>
        <ul className="mt-3 grid gap-1.5 text-sm text-pretty text-muted-foreground">
          {NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <span aria-hidden className="mt-2.5 h-px w-2.5 shrink-0 bg-muted-foreground/60" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      {/*===== Steps =====*/}
      <div className={cn("relative border-t px-5 pt-5 pb-6 xl:border-t-0 xl:p-6 xl:ps-8", ADMIN_TEAR)}>
        <span aria-hidden className={cn(NOTCH, "-start-2.5 -top-2.5 xl:hidden")} />
        <span aria-hidden className={cn(NOTCH, "-end-2.5 -top-2.5 xl:hidden")} />

        {/*------ One Line per Step ------*/}
        <ol aria-labelledby={fieldId} aria-describedby={messageId} className="flex flex-col gap-2">
          {fields.map((item, index) => {
            const fromField = register(`tiers.${index}.fromCustomer`);
            const percentField = register(`tiers.${index}.percent`);
            const stepName = `پله‌ی ${formatNumberFa(index + 1)}`;

            return (
              <li key={item.id} className="answer-in flex items-center gap-2 sm:gap-2.5">
                <span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground sm:w-16">از مشتری</span>
                {index === 0 ? (
                  // The first step always starts at the first customer: shown, not typed.
                  <span className="grid h-11 w-16 place-items-center font-display text-xl font-extrabold tabular-nums sm:w-20">
                    {formatNumberFa(1)}
                  </span>
                ) : (
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`${stepName}: از مشتری چندم`}
                    className={STEP_FIELD}
                    {...fromField}
                    onChange={(event) => {
                      typedDigits(event);
                      void fromField.onChange(event);
                    }}
                  />
                )}
                <span aria-hidden className="text-sm text-muted-foreground">
                  ←
                </span>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`${stepName}: درصد`}
                  className={STEP_FIELD}
                  {...percentField}
                  onChange={(event) => {
                    typedDigits(event);
                    void percentField.onChange(event);
                  }}
                />
                <span className="text-base font-bold">٪</span>
              </li>
            );
          })}
        </ol>

        {/*------ The Stairs ------*/}
        {/* What the partners will see. The last valid table stays drawn while he is mid-typo. */}
        <div className="mt-5 rounded-2xl border border-foreground/10 px-4 pt-4 pb-3">
          <CommissionStairs tiers={tiers ?? setting.tiers} />
        </div>

        {/*------ Example or Error ------*/}
        {errorMessage ? (
          <p
            key={errorMessage}
            id={messageId}
            role="alert"
            className="answer-in mt-4 flex items-start gap-1.5 text-sm text-pretty text-destructive"
          >
            <CircleAlertIcon aria-hidden strokeWidth={1.8} className="mt-0.5 size-4 shrink-0" />
            {errorMessage}
          </p>
        ) : (
          <p id={messageId} className="mt-4 text-base leading-8 text-pretty text-foreground">
            {tiers && <TierExample tiers={tiers} />}
          </p>
        )}

        {alertMessage && (
          <div key={alertMessage} className="answer-in mt-4">
            <FormAlert message={alertMessage} />
          </div>
        )}
      </div>

      {/*===== Foot =====*/}
      <div
        className={cn(
          "col-span-full grid border-t sm:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-subgrid",
          ADMIN_HAIRLINE,
        )}
      >
        {/*------ Default ------*/}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pt-3 sm:py-3 xl:px-6">
          <p className="text-sm text-muted-foreground">
            پیش‌فرض:{" "}
            <span className="font-bold text-foreground">
              {setting.defaultTiers.map((tier) => `${formatNumberFa(tier.percent)}٪`).join("، ")}
            </span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            focusableWhenDisabled
            disabled={isDefault}
            className="-ms-3 text-muted-foreground hover:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
            onClick={() => {
              touch();
              replace(toFormTiers(setting.defaultTiers));
            }}
          >
            <RotateCcwIcon aria-hidden />
            برگردوندن به پیش‌فرض
          </Button>
        </div>

        {/*------ Save ------*/}
        <div className="flex flex-col gap-3 px-5 pt-2 pb-5 sm:flex-row sm:items-center sm:justify-between sm:py-3 xl:ps-8 xl:pe-6">
          <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
            {stamp > 0 && (
              <span
                key={stamp}
                className="as-stamp inline-flex items-center rounded-lg border-[3px] border-double border-success px-2.5 font-display text-base font-black text-success"
              >
                ذخیره شد
              </span>
            )}
            <p className="text-sm text-muted-foreground">
              {setting.updatedAt ? `آخرین تغییر: ${formatJalaliTimestamp(setting.updatedAt)}` : "هنوز عوض نشده"}
            </p>
          </div>

          <Button
            type="submit"
            variant={isChanged || save.isPending ? "solid" : "outline"}
            size="sm"
            focusableWhenDisabled
            className={cn(
              "h-11 w-full sm:h-10 sm:w-auto sm:min-w-28 data-disabled:pointer-events-none",
              !isChanged && !save.isPending && cn(INK_OUTLINE, "text-muted-foreground"),
            )}
            disabled={!isChanged || save.isPending}
          >
            {save.isPending && <Spinner aria-hidden />}
            {save.isPending ? "ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/*===== Tier Example =====*/
/**
 * One worked example under the stairs: the first customer of the second step (where a partner first climbs), or the
 * first customer when there is one step. Its values pop when his numbers move them.
 */
function TierExample({ tiers }: { tiers: CommissionTier[] }) {
  const customer = tiers[1]?.fromCustomer ?? 1;
  const percent = commissionPercentFor({ tiers, customerCount: customer });
  const amount = calculateCommission({ baseAmount: EXAMPLE_SALE_RIAL, percent });

  return (
    <>
      {`از خرید ${formatToman(EXAMPLE_SALE_RIAL)}یِ مشتری `}
      <PopText text={`${formatNumberFa(customer)}امِ`} />
      {" همکار، "}
      <PopText text={`${formatNumberFa(percent)}٪`} />
      {" یعنی "}
      <PopText text={formatToman(amount)} />
      {" هدیه‌ی معرفی می‌نویسیم."}
    </>
  );
}
