import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import {
  EVALUATION_PERIOD_LABELS,
  EVALUATION_PERIODS,
  EVALUATION_WEEKDAY_LABELS,
  EVALUATION_WEEKDAYS,
  type EvaluationPeriod,
  type EvaluationWeekday,
} from "~/orpc/evaluation/constants";
import { m } from "~/paraglide/messages";
import { PLATE } from "~/routes/account_cart/column";
import { EdgeDog } from "~/routes/account_cart/components/edge-dog";
import { PlateHead } from "~/routes/account_cart/components/plate-head";

/*===== When Free =====*/
/**
 * «کی هماهنگ کنیم؟» (F5): optional. The weekdays and parts of the day the customer is usually free, sent with «پرداخت» so
 * the call that arranges the lessons starts from them. It books nothing, and the plate says so.
 *
 * The `calendar` dog sits on the plate's edge by the dimmed clock (as on the Evaluation Request: when you're free). He
 * speaks only while a chip has focus or once something is picked, and his line is decoration: the plate's sentence
 * says the same in plain words.
 */
export function WhenFree({
  days,
  periods,
  onDaysChange,
  onPeriodsChange,
}: {
  days: readonly EvaluationWeekday[];
  periods: readonly EvaluationPeriod[];
  onDaysChange: (days: EvaluationWeekday[]) => void;
  onPeriodsChange: (periods: EvaluationPeriod[]) => void;
}) {
  const [focused, setFocused] = useState(false);
  const speaks = focused || days.length + periods.length > 0;

  return (
    <section aria-labelledby="cart-when-free-title" className="mt-8 lg:mt-4">
      <PlateHead
        figureClassName="me-12 lg:me-16"
        heading={
          <h2 id="cart-when-free-title" className={cn(DISPLAY_HEADING, "text-2xl text-balance lg:text-3xl")}>
            {m.account_cart_free_title()}{" "}
            <span className="font-sans text-sm font-normal whitespace-nowrap text-muted-foreground">
              {m.account_cart_free_optional()}
            </span>
          </h2>
        }
      >
        <EdgeDog name="calendar" scenery={{ name: "clock", width: "62%" }} className="w-[5.25rem] lg:w-[7rem]">
          {speaks && (
            // Physical: over his head, opening towards the words; the tail (1.75rem in from the end nearest him, left
            // in Persian) aims down at him. The English figure is mirrored, so the bubble opens to the left there.
            <ChalkBubble
              tail="end"
              className="answer-pop absolute bottom-[94%] left-[26%] w-max max-w-[min(13rem,calc(100vw-9rem))] text-pretty [--pop-origin:1.75rem_100%] lg:max-w-[15rem] ltr:right-[26%] ltr:left-auto ltr:[--pop-origin:calc(100%-1.75rem)_100%]"
            >
              {m.account_cart_free_bubble()}
            </ChalkBubble>
          )}
        </EdgeDog>
      </PlateHead>

      {/* Focus moving in and out of the chips makes him speak; the listeners are on an inner div (a11y lint). */}
      <div
        className={cn(PLATE, "p-5 sm:p-6 lg:p-8")}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
      >
        <p className="max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground">
          {m.account_cart_free_intro()}
        </p>

        <div className="mt-6 flex flex-col gap-6">
          <ChipGroup
            name="availableDays"
            legend={m.account_cart_free_days_legend()}
            options={EVALUATION_WEEKDAYS.map((value) => ({ value, label: EVALUATION_WEEKDAY_LABELS[value] }))}
            picked={days}
            onChange={onDaysChange}
          />
          <ChipGroup
            name="availablePeriods"
            legend={m.account_cart_free_periods_legend()}
            options={EVALUATION_PERIODS.map((value) => ({ value, label: EVALUATION_PERIOD_LABELS[value] }))}
            picked={periods}
            onChange={onPeriodsChange}
          />
        </div>
      </div>
    </section>
  );
}

/*===== Chip Group =====*/
/** A labelled row of toggle chips; the picked values stay in the options' order, whatever order they were tapped in. */
function ChipGroup<Value extends string>({
  name,
  legend,
  options,
  picked,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly { value: Value; label: string }[];
  picked: readonly Value[];
  onChange: (picked: Value[]) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <PickChip
            key={option.value}
            name={name}
            label={option.label}
            checked={picked.includes(option.value)}
            onChange={(checked) =>
              onChange(
                options
                  .map((item) => item.value)
                  .filter((value) => (value === option.value ? checked : picked.includes(value))),
              )
            }
          />
        ))}
      </div>
    </fieldset>
  );
}

/*===== Pick Chip =====*/
/**
 * One toggle as a pill on the plate (the Evaluation Request's chip): a native checkbox underneath, so Space and screen
 * readers work as usual. Picked is told by the gold border, the tint and the tick, which pops in from its centre.
 */
function PickChip({
  label,
  checked,
  onChange,
  name,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
}) {
  return (
    <label className="relative">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-foreground/20 bg-card px-4 text-sm font-bold text-muted-foreground select-none",
          "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-foreground",
          "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:border-primary/50 hover:text-foreground",
          "transition-colors motion-safe:transition-[translate,border-color,background-color,color] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
        )}
      >
        {checked && (
          <CheckIcon aria-hidden className="answer-pop size-4 text-primary [--pop-origin:50%_50%]" strokeWidth={3} />
        )}
        {label}
      </span>
    </label>
  );
}
