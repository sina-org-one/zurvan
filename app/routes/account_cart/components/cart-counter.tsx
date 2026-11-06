import { cn } from "cn";
import { LockIcon } from "lucide-react";

import { BoardingCostNote } from "~/components/boarding-cost-note";
import { ChalkBubble } from "~/components/chalk-bubble";
import { FormAlert } from "~/components/form-alert";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { RulesTick } from "~/components/rules-tick";
import { Button, buttonVariants } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { formatToman } from "~/lib/course-format";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";
import { PLATE } from "~/routes/account_cart/column";
import { countCourses, countDogs } from "~/routes/account_cart/counts";
import { PlateHead } from "~/routes/account_cart/components/plate-head";
import { useChanged } from "~/routes/account_cart/hooks/use-changed";

/*===== Toman =====*/
/**
 * The amount without its unit, for the big gold numerals with «تومان» ("Toman") in body text beside them. Taken from
 * `formatToman` so the Rial → Toman conversion stays in one place; the unit stripped is the page language's.
 */
function tomanNumber(rial: number) {
  return formatToman(rial).replace(m.account_cart_counter_unit(), "").trim();
}

/** An amount that never breaks across lines inside a sentence (it used to sit in a `whitespace-nowrap` span). */
function unbroken(text: string) {
  return text.replaceAll(" ", "\u00a0");
}

/*===== Cart Counter =====*/
/**
 * «جمع سبد», the counter with the till: how many courses for how many dogs, what «پرداخت» charges now in big gold numerals
 * (the server's `dueNow`: the whole price, or the deposit with the full price and what's left said under it), how many
 * items aren't counted, and the one main button. Only what can be paid is counted. «پرداخت» waits while a course still
 * needs its place picked (the line under it says how many), and with boarding picked the note under the total says
 * its cost is apart, agreed on the phone.
 *
 * On the plate's top edge the center's dog lies counting his coins beside the dimmed till, in silence. While paying he
 * turns into the dog with the gold card in his mouth (a crossfade) and says «کارتو آوردم!»; the button says the same in
 * plain words («در حال رفتن به درگاه…»).
 *
 * `refreshing` is a removal's total on its way: the old total stays, dimmed, and «پرداخت» waits, so nobody pays a number
 * the page is about to change. The new total rises in when it lands (keyed by its value).
 */
export function CartCounter({
  courseCount,
  dogCount,
  unavailableCount,
  unplacedCount,
  hasBoarding,
  total,
  depositPercent,
  dueNow,
  refreshing,
  busy,
  paying,
  message,
  needsRules,
  rulesTicked,
  onRulesTick,
  onPay,
}: {
  courseCount: number;
  dogCount: number;
  unavailableCount: number;
  /** Payable courses whose place isn't picked yet: «پرداخت» waits for them (F5). */
  unplacedCount: number;
  /** Boarding is picked for a course: its extra cost isn't in the total, and the note under the total says so. */
  hasBoarding: boolean;
  /** Rial, from the server: the full price of what can be paid. */
  total: number;
  /** The deposit percent in force, from the server (100: the whole price is taken now). */
  depositPercent: number;
  /** Rial, from the server: what «پرداخت» charges now. */
  dueNow: number;
  refreshing: boolean;
  /** «پرداخت» can't be pressed yet: paying has started, or the rules check is still on its way. */
  busy: boolean;
  /** Paying has started and the browser hasn't left yet: the counter's dog brings the card. */
  paying: boolean;
  /** Why the last payment didn't start. */
  message: string | undefined;
  /** Site rules are published and this customer hasn't accepted them: the tick is shown and «پرداخت» waits for it (F13). */
  needsRules: boolean;
  rulesTicked: boolean;
  onRulesTick: (ticked: boolean) => void;
  onPay: () => void;
}) {
  const nothingToPay = courseCount === 0;
  const waitsForPlace = !nothingToPay && unplacedCount > 0;
  const shown = nothingToPay ? 0 : dueNow;
  const totalChanged = useChanged(String(shown));
  const deposit = !nothingToPay && depositPercent < 100;

  return (
    <section aria-labelledby="cart-summary-title">
      {/*===== Heading and the Till =====*/}
      <PlateHead
        figureClassName="me-16 lg:me-20"
        heading={
          <h2 id="cart-summary-title" className={cn(DISPLAY_HEADING, "text-2xl lg:text-3xl")}>
            {m.account_cart_counter_title()}
          </h2>
        }
      >
        <CounterDog paying={paying} />
      </PlateHead>

      {/*===== Counter =====*/}
      <div className={cn(PLATE, "p-5 sm:p-7")}>
        {/*------ What Is Counted ------*/}
        <p className="text-muted-foreground">
          {nothingToPay
            ? m.account_cart_counter_none()
            : m.account_cart_counter_counted({ courses: countCourses(courseCount), dogs: countDogs(dogCount) })}
        </p>

        {/*------ Total ------*/}
        {deposit && (
          <p className="mt-3 text-sm font-bold text-muted-foreground">{m.account_cart_counter_deposit_now()}</p>
        )}
        <p
          aria-busy={refreshing}
          className={cn(
            "flex flex-wrap items-baseline gap-x-2.5 transition-opacity duration-300 motion-reduce:transition-none",
            deposit ? "mt-1" : "mt-3",
            refreshing && "opacity-45",
          )}
        >
          {/* Nothing to pay is a calm dash: a Persian zero is a dot, which reads as nothing at all. */}
          {nothingToPay ? (
            <span className="font-display text-4xl leading-none font-black text-muted-foreground sm:text-5xl">
              —<span className="sr-only">{m.account_cart_counter_zero_sr()}</span>
            </span>
          ) : (
            <>
              <span
                key={shown}
                className={cn(
                  "font-display text-4xl leading-none font-black whitespace-nowrap text-primary sm:text-5xl",
                  totalChanged && "answer-in",
                )}
              >
                {tomanNumber(shown)}
              </span>
              <span className="font-bold whitespace-nowrap">{m.account_cart_counter_unit()}</span>
            </>
          )}
        </p>

        {/* With a deposit the big number is what is charged now; the full price and what is left are said under it. */}
        {deposit && (
          <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
            {m.account_cart_counter_deposit_note({
              percent: formatNumber(depositPercent),
              total: unbroken(formatToman(total)),
              left: unbroken(formatToman(total - dueNow)),
            })}
          </p>
        )}
        {/* Under the total it doesn't include: boarding's cost is agreed on the phone (F5). */}
        {hasBoarding && !nothingToPay && <BoardingCostNote className="mt-3" />}
        {unavailableCount > 0 && (
          <p className="mt-3 text-sm text-pretty text-muted-foreground">
            {unavailableCount === 1
              ? m.account_cart_counter_unavailable_one({ count: formatNumber(unavailableCount) })
              : m.account_cart_counter_unavailable_other({ count: formatNumber(unavailableCount) })}
          </p>
        )}

        <p className="mt-5 border-t border-dashed border-foreground/20 pt-5 text-sm leading-relaxed text-pretty text-muted-foreground">
          {m.account_cart_counter_after_pay()}
        </p>

        {/*------ Actions ------*/}
        <div className="mt-5 flex flex-col gap-3">
          <FormAlert message={message} />
          {needsRules && !nothingToPay && (
            <RulesTick id="cart-rules" checked={rulesTicked} onCheckedChange={onRulesTick} />
          )}
          <Button
            type="button"
            variant="solid"
            size="lg"
            disabled={nothingToPay || waitsForPlace || refreshing || busy || (needsRules && !rulesTicked)}
            aria-describedby={nothingToPay ? "cart-nothing-reason" : waitsForPlace ? "cart-place-reason" : undefined}
            onClick={onPay}
            className="w-full"
          >
            {/* `busy` also covers the rules check still loading; only a payment on its way says it is going to the gateway. */}
            {paying && <Spinner aria-hidden />}
            {paying
              ? m.account_cart_counter_going()
              : nothingToPay
                ? m.account_cart_counter_nothing()
                : m.account_cart_counter_pay()}
          </Button>
          {nothingToPay && (
            <p id="cart-nothing-reason" className="text-center text-sm text-pretty text-muted-foreground">
              {m.account_cart_counter_nothing_reason()}
            </p>
          )}
          {waitsForPlace && (
            <p id="cart-place-reason" className="text-center text-sm font-bold text-pretty text-primary">
              {unplacedCount === 1
                ? m.account_cart_counter_unplaced_one({ count: formatNumber(unplacedCount) })
                : m.account_cart_counter_unplaced_other({ count: formatNumber(unplacedCount) })}
            </p>
          )}
          <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-pretty text-muted-foreground">
            <LockIcon aria-hidden strokeWidth={2} className="mt-0.5 size-3.5 shrink-0" />
            {m.account_cart_counter_secure()}
          </p>
          <Link to="/courses" className={buttonVariants({ variant: "outline", size: "lg", className: "mt-1 w-full" })}>
            {m.account_cart_counter_add_another()}
          </Link>
        </div>
      </div>
    </section>
  );
}

/*===== Counter Dog =====*/
/**
 * The figure on the counter's edge (physical sides: he faces right, the till stands behind him on the left). Two dogs in
 * one place, crossfading: lying nose-down over his coins, or, while paying, sitting with the gold card in his mouth.
 * Both stay mounted so the change is a fade, not a snap; the card dog is a little taller and stands up past the box.
 *
 * On the English pages the figure is at the row's right end, so the picture is mirrored (`ltr:-scale-x-100`) to keep
 * the till outside, away from the heading; the bubble's box mirrors back so its words read.
 */
function CounterDog({ paying }: { paying: boolean }) {
  const fade = "transition-opacity duration-500 ease-out motion-reduce:transition-none";

  return (
    <div className="relative w-[8.5rem] translate-y-[3%] lg:w-[9.5rem] ltr:-scale-x-100">
      <div className="absolute -inset-x-1/2 -top-1/2 bottom-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_65%,rgb(255_194_26/0.08),transparent)]" />

      {/*------ The Till ------*/}
      <div className="absolute right-[80%] bottom-0 w-[66%] translate-y-[3%]">
        <MascotCut name="register" className="block w-full" />
        <MascotCut
          name="plants"
          className="lively-sway-2 absolute right-[78%] bottom-0 w-[44%] translate-y-[4%] -scale-x-100"
        />
      </div>
      <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[86%] w-[30%]" />

      {/*------ Counting, or the Card ------*/}
      <div className="ct-edge-rise relative">
        <MascotCut name="coins" className={cn("lively-breathe block w-full", fade, paying && "opacity-0")} />
        <div className={cn("absolute bottom-0 left-[24%] w-[54%]", fade, !paying && "opacity-0")}>
          <MascotCut name="card" className="lively-breathe block w-full" />
          {paying && (
            // Physical: beside his head on his right, between him and the heading (above him is the hero's path on a
            // laptop); the tail (left, 1.75rem in) aims down at his muzzle. The box carries the place; in English it
            // flips back inside the mirrored figure, so the words read and the tail (`end`, the right there) still
            // points at him.
            <div className="absolute bottom-[62%] left-[70%] w-max ltr:-scale-x-100">
              <ChalkBubble
                tail="end"
                className="answer-pop max-w-none [--answer-delay:0.25s] [--pop-origin:1.75rem_100%] ltr:[--pop-origin:calc(100%-1.75rem)_100%]"
              >
                {m.account_cart_counter_card_bubble()}
              </ChalkBubble>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
