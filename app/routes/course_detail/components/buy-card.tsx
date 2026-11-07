import { cn } from "cn";
import { CheckIcon, ShoppingCartIcon } from "lucide-react";

import { Link } from "~/components/link";
import { Button, buttonVariants } from "~/components/ui/button";
import { formatToman } from "~/lib/course-format";
import { CART_PATH } from "~/orpc/checkout/constants";
import type { Course } from "~/orpc/course/contract";
import { m } from "~/paraglide/messages";
import { BuyProblems } from "~/routes/course_detail/components/buy-problems";
import { CourseDog } from "~/routes/course_detail/components/course-dog";
import { DogRowList } from "~/routes/course_detail/components/dog-row-list";
import type { BuyCardState } from "~/routes/course_detail/components/use-buy-card";

/*===== Buy Card =====*/
/**
 * The page's one idea: the course's own dog stands on the card and talks, and the customer's dog answers below. The price, the customer's dogs with a verdict each, the picked
 * dog's bubble, and the one gold button. Every state of the viewer (signed out, no dogs, no price, a dog that can't
 * buy yet) is the same card with different words, so the page never jumps.
 *
 * The mascot is the card's only picture: the course photo shows on phones above the title (in the hero) and in the
 * catalogue, not here, so a drawn dog never stands on a photographed one. The price hangs from the card's top edge as a
 * chalk price tag, in ivory.
 */
export function BuyCard({
  course,
  buy,
  cardRef,
}: {
  course: Course;
  buy: BuyCardState;
  /** Watched by the phone action bar, which steps aside while the card is on screen. */
  cardRef: React.Ref<HTMLDivElement>;
}) {
  return (
    // When the words beside it run longer than the card, the card still ends on the hero's path.
    <div className="relative flex flex-col lg:justify-end">
      {/*------ The Course's Dog ------*/}
      <CourseDog course={course} />

      <div
        ref={cardRef}
        id="buy-card"
        className="relative scroll-mt-24 overflow-hidden rounded-4xl border border-border bg-card shadow-sm"
      >
        <div className="relative flex flex-col gap-5 p-5 sm:p-7">
          {/*------ Price ------*/}
          <PriceTag price={course.price} />

          {/*------ What the Viewer Needs to Do ------*/}
          <Body course={course} buy={buy} />

          {/*------ Action ------*/}
          <div className="flex flex-col gap-3">
            <BuyButton buy={buy} className="w-full" />
            {/* A new key per dog, so each dog's reasons fade in as an answer to picking it. */}
            {buy.action.kind === "blocked" && buy.verdict && (
              <BuyProblems key={buy.pickedId} problems={buy.verdict.problems} />
            )}
            {/* The second way in is a line, not a second big button: the free evaluation is for a dog that hasn't
                been seen yet, so the line says when to take it. */}
            {buy.quieter && (
              <p className="text-center text-sm text-muted-foreground">
                {m.course_detail_buy_quieter_ask()}{" "}
                <Link
                  {...buy.quieter.link}
                  className="rounded-sm font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {buy.quieter.label}
                </Link>
              </p>
            )}

            {/* Always mounted: a live region has to exist before its text changes to be announced. The full-cart
                message is for everyone, so it is visible; «added» only repeats what the button now says. */}
            <output className={cn("block", buy.message === "full" ? "text-sm text-pretty text-foreground" : "sr-only")}>
              {buy.message === "added" && m.course_detail_buy_message_added()}
              {buy.message === "full" && <span className="answer-in block">{m.course_detail_buy_message_full()}</span>}
            </output>
          </div>

          {buy.mode !== "evaluation" && (
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {m.course_detail_buy_after_pay()}
              <Link
                to="/help"
                hash="how-buying-works"
                className="mt-1 block w-fit rounded-sm font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {m.course_detail_buy_how_it_works()}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/*===== Price Tag =====*/
/**
 * The price on a chalk tag pinned to the card's top edge: a string runs from the pin to the tag's hole, and the tag
 * hangs a little askew from it. The outline is drawn by an SVG stretched to the tag (`non-scaling-stroke` keeps the ink
 * even), so the tag fits its words whatever the price; the hole is its own circle, which stretching would squash.
 * Physical sides on purpose: the point and the hole are on the tag's right, the reading start in RTL, so the tag is
 * pinned clear of the dog in the left corner. In English the whole tag is mirrored (`ltr:`), the dog being on the right.
 */
function PriceTag({ price }: { price: number | null }) {
  return (
    // The string is as tall as the card's top padding plus this margin, so the pin lands on the card's edge.
    <div className="relative mt-4 w-max max-w-full self-start">
      {/*------ Pin and String ------*/}
      <span
        aria-hidden
        className="absolute right-[1.375rem] bottom-[calc(50%-0.25rem)] h-[calc(50%+2.5rem)] w-0.5 rounded-full bg-foreground/45 sm:h-[calc(50%+3rem)] ltr:right-auto ltr:left-[1.375rem]"
      />
      <span
        aria-hidden
        className="absolute -top-[2.65rem] right-[1.125rem] size-2.5 rounded-full bg-foreground sm:-top-[3.15rem] ltr:right-auto ltr:left-[1.125rem]"
      />

      {/*------ Tag ------*/}
      <p className="relative flex origin-[calc(100%-1.4rem)_50%] -rotate-[2.5deg] flex-col py-3 ps-14 pe-5 ltr:origin-[1.4rem_50%] ltr:rotate-[2.5deg]">
        <svg
          aria-hidden
          viewBox="0 0 200 80"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible text-foreground ltr:-scale-x-100"
        >
          <path
            d="M10 2H168L198 40L168 78H10Q2 78 2 70V10Q2 2 10 2Z"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden
          className="absolute top-1/2 right-[1.125rem] size-2.5 -translate-y-1/2 rounded-full border-2 border-foreground bg-card ltr:right-auto ltr:left-[1.125rem]"
        />

        <span className="relative text-sm text-muted-foreground">{m.course_detail_buy_price_label()}</span>
        <span className={cn("relative font-black text-foreground", price === null ? "text-2xl" : "text-3xl")}>
          {price === null ? m.shared_course_after_evaluation() : formatToman(price)}
        </span>
      </p>
    </div>
  );
}

/*===== Body =====*/
/** The words and the dog list between the price and the button, by the viewer's state. */
function Body({ course, buy }: { course: Course; buy: BuyCardState }) {
  switch (buy.mode) {
    case "evaluation":
      return course.price === null ? (
        <p className="text-pretty text-muted-foreground">{m.course_detail_buy_body_evaluation()}</p>
      ) : null;
    case "visitor":
      return <p className="text-pretty text-muted-foreground">{m.course_detail_buy_body_visitor()}</p>;
    case "no-dogs":
      return <p className="text-pretty text-muted-foreground">{m.course_detail_buy_body_no_dogs()}</p>;
    case "dogs":
      return <DogRowList dogs={buy.dogs} pickedId={buy.pickedId} verdict={buy.verdict} onPick={buy.pick} />;
  }
}

/*===== Buy Button =====*/
/**
 * The one main button for the current state. The card and the phone bar both draw it from the same state, so they
 * always agree. A button that can't be used yet says why in its own label; it isn't hidden.
 */
export function BuyButton({
  buy,
  className,
  size = "lg",
}: {
  buy: BuyCardState;
  className?: string;
  size?: "lg" | "default";
}) {
  const { action } = buy;

  switch (action.kind) {
    case "link":
      return (
        <Link {...action.link} className={buttonVariants({ variant: "solid", size, className })}>
          {action.label}
        </Link>
      );
    case "pick":
      return (
        <Button type="button" variant="solid" size={size} disabled className={className}>
          {m.course_detail_buy_action_pick()}
        </Button>
      );
    case "blocked":
      return (
        <Button type="button" variant="solid" size={size} disabled className={className}>
          {m.course_detail_buy_action_add()}
        </Button>
      );
    case "add":
      return (
        <Button type="button" variant="solid" size={size} onClick={buy.add} className={className}>
          <ShoppingCartIcon aria-hidden />
          {m.course_detail_buy_action_add()}
        </Button>
      );
    case "in-cart":
      return (
        // Just added, it pops in place of the button it replaces; already in the cart on load, it is simply there.
        <span className={cn("flex flex-col items-center gap-2", buy.message === "added" && "answer-pop", className)}>
          {/* Not a button: there is nothing to press. The state is the words. */}
          <span
            className={buttonVariants({
              variant: "outline",
              size,
              className: "w-full border-primary/60 text-primary hover:bg-card hover:text-primary",
            })}
          >
            <CheckIcon aria-hidden strokeWidth={2.6} />
            {m.course_detail_buy_action_in_cart()}
          </span>
          <Link
            to={CART_PATH}
            className="rounded-sm text-sm font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {m.course_detail_buy_action_view_cart()}
          </Link>
        </span>
      );
  }
}
