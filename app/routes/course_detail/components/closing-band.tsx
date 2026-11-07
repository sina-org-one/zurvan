import { ChalkBubble } from "~/components/chalk-bubble";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { BRICK } from "~/lib/brick";
import { formatNumber } from "~/lib/locale-format";
import { COLUMN } from "~/routes/course_detail/column";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Steps =====*/
// How buying works, in order (app-spec F5, F6): the course is bought from the cart (upfront, as before), the trainer
// calls, training starts. It is a sequence, so it is numbered. The words follow the owner's notes (2026-10-19): the first
// step doesn't lead with the payment, and the last doesn't promise «private» or «home or outside» (the kind of class is
// arranged on the call; where a course is held is written on its own page).
// A function, not a constant: the words are read while rendering, in the page's language.
const steps = () =>
  [
    { title: m.course_detail_closing_step_pick_title(), detail: m.course_detail_closing_step_pick_detail() },
    {
      title: m.course_detail_closing_step_call_title(),
      detail: m.course_detail_closing_step_call_detail(),
    },
    { title: m.course_detail_closing_step_train_title(), detail: m.course_detail_closing_step_train_detail() },
  ] as const;

/*===== Closing Band =====*/
/**
 * The page's last word: why the courses open after the free evaluation, and the three steps after a purchase, which
 * answer "and then what?". It no longer carries a button of its own for the evaluation (the owner wants that ask kept
 * to the menu, the quick actions and the buy card, 2026-10-19): a quiet link goes to the help page's answer.
 *
 * The band is the page's one grey band, built as a brick wall (as the catalogue's shelf) with a light coping, and the
 * dog sits on top of it at the start side between two bushes, saying he started this way too. The page leaves room
 * above for him and lets the band run into the footer. The steps hang on the wall as a dark plate. Puts its content
 * back in the page column and carries its own padding; on phones it leaves room at the bottom for the buy strip
 * docked on the tab bar.
 */
export function ClosingBand() {
  return (
    <section
      aria-labelledby="closing-title"
      style={{ backgroundImage: `var(--grain), ${BRICK}` }}
      className="relative border-t-2 border-t-foreground/60 surface-inverse py-section-md max-lg:pb-32"
    >
      {/*------ The Dog on the Wall ------*/}
      {/* His paws rest on the coping, under the learn column, which ends higher than the lane beside it. Physical
          sides on purpose: he sits at the right (the start side in RTL) and his bubble opens to his left. */}
      <div aria-hidden className={`${COLUMN} pointer-events-none absolute inset-x-0 bottom-full`}>
        <div className="relative ms-[8%] w-24 translate-y-[3%] md:ms-[14%] md:w-32">
          <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[78%] w-[62%]" />
          <MascotCut name="plants" className="lively-sway-2 absolute right-[80%] bottom-0 w-[52%] -scale-x-100" />
          <MascotCut name="sit" className="lively-breathe relative block w-full" />
          <ChalkBubble
            tail="start"
            className="lively-reveal-pop absolute right-[86%] bottom-[66%] w-max max-w-[11rem] text-pretty md:max-w-[14rem] ltr:right-auto ltr:left-[86%]"
          >
            {m.course_detail_closing_bubble()}
          </ChalkBubble>
        </div>
      </div>

      <div className={`${COLUMN} grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-x-16`}>
        {/*------ Words ------*/}
        <div>
          <h2 id="closing-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
            {m.course_detail_closing_title()}
          </h2>
          <p className="mt-3 max-w-[34rem] text-pretty text-muted-foreground">{m.course_detail_closing_text()}</p>
          <Link
            to="/help"
            hash="what-is-evaluation"
            className="mt-5 inline-block rounded-sm font-bold text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {m.course_detail_closing_link()}
          </Link>
        </div>

        {/*------ Steps ------*/}
        <ol className="divide-y divide-border rounded-3xl border border-border bg-jet paper-grain px-5 shadow-sm sm:px-6">
          {steps().map(({ title, detail }, index) => (
            <li key={title} className="flex items-start gap-4 py-4">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/40 text-sm font-extrabold text-foreground"
              >
                {formatNumber(index + 1)}
              </span>
              <div className="min-w-0">
                <p className="font-extrabold">{title}</p>
                <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
