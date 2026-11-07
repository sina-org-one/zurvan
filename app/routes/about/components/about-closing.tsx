import { ChalkBubble } from "~/components/chalk-bubble";
import { EvaluationButton } from "~/components/evaluation-button";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { buttonVariants } from "~/components/ui/button";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/about/column";

/*===== Closing =====*/
/**
 * The page's last ask: a raised card with the two ways forward and the grown-up dog sitting on its top edge, telling
 * the visitor he started as a naughty puppy too. The page leaves room above the card for him. His bubble and bushes
 * use physical sides on purpose (the tail aims at the picture); he sits at the card's end corner, the left in RTL.
 */
export function AboutClosing() {
  return (
    <section aria-labelledby="about-closing-title" className={`${COLUMN} pt-44 md:pt-64`}>
      <div className="relative">
        {/*------ The dog on the card's edge ------*/}
        <div aria-hidden className="pointer-events-none absolute bottom-full left-3 z-10 flex items-end md:left-[38%]">
          {/* A park bench with a street lamp, the dog sits at its start side, the lamp at the far end. */}
          <MascotCut name="bench" className="relative -mb-px w-40 translate-y-[2%] md:w-60" />
          <div className="relative -ms-8 w-24 translate-y-[3%] md:-ms-12 md:w-36">
            <div className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_45%_60%_at_50%_85%,rgb(255_194_26/0.09),transparent)]" />
            <MascotCut name="plants" className="lively-sway-2 absolute right-[80%] bottom-0 w-[52%] -scale-x-100" />
            <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[76%] w-[62%]" />
            <MascotCut name="sit" className="lively-breathe relative block w-full" />
            <ChalkBubble
              tail="left"
              className="lively-float-2 absolute bottom-[78%] left-[70%] w-max max-w-[12.5rem] text-pretty md:max-w-[16rem] max-md:ltr:max-w-[9rem]"
            >
              {m.about_closing_bubble()}
            </ChalkBubble>
          </div>
        </div>

        {/*------ The sky ------*/}
        {/* The chalk night sky over the whole row, as on the course stages, so the paper beside the dog isn't bare. */}
        <NightSky className="inset-x-0 bottom-full h-44 md:h-56" />

        {/*------ The card ------*/}
        <div className="rounded-4xl border border-border bg-card paper-grain px-6 py-9 shadow-sm sm:px-10 md:flex md:items-center md:justify-between md:gap-10 md:px-14 md:py-12">
          <h2 id="about-closing-title" className={`${DISPLAY_HEADING} text-h2 md:text-h1`}>
            <span className="block">{m.about_closing_question()}</span>
            <span className="block">{m.about_closing_call()}</span>
          </h2>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row md:mt-0 md:shrink-0">
            <EvaluationButton className="h-12">{m.about_closing_evaluation()}</EvaluationButton>
            <Link to="/contact" className={buttonVariants({ variant: "outline", className: "h-12 px-7 text-base" })}>
              {m.about_closing_contact()}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
