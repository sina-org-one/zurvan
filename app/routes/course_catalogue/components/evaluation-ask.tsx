import { Link } from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Evaluation Ask =====*/
/**
 * The page's quieter exit, under the cards: a visitor who can't pick is sent to the free evaluation. A raised card with
 * no dog, so the one dog on this page stays the counter.
 */
export function EvaluationAsk() {
  return (
    <section
      aria-labelledby="ask-title"
      className="rounded-4xl border border-border bg-card paper-grain px-6 py-10 shadow-sm sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-12"
    >
      <div className="max-w-xl">
        <h2 id="ask-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
          {m.course_catalogue_ask_title()}
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">{m.course_catalogue_ask_text()}</p>
      </div>
      <Link
        to="/assessment"
        className={buttonVariants({
          variant: "solid",
          size: "lg",
          className: "mt-8 w-full shrink-0 lg:mt-0 lg:w-auto lg:min-w-52",
        })}
      >
        {m.course_catalogue_ask_button()}
      </Link>
    </section>
  );
}
