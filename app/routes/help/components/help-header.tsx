import { ChalkBubble } from "~/components/chalk-bubble";
import { GroundStrip } from "~/components/ground-strip";
import { MascotCut } from "~/components/mascot-cut";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Help Header =====*/
/**
 * The page's top: the headline and one line of help, with the dog thinking in front of the notice board, as if the
 * questions were pinned up on it. The page's key fact ("after you ask, the center calls") is the road's dog's line,
 * not this one: here he only invites you to start.
 *
 * Wide: words at the start, the stage (board, dog, bush, bubble) at the end. Phones: the stage on top, the words under.
 *
 * The stage's pieces are placed by physical sides: the board, the dog and the bubble's tail are tied to the picture
 * (he looks to the right, at the words), not to the reading direction. His height sets the bubble's place above him.
 */
export function HelpHeader() {
  return (
    <section
      aria-labelledby="help-title"
      className="site-container grid items-center gap-y-6 pt-section-sm pb-section-sm lg:grid-cols-12 lg:gap-x-12"
    >
      {/*===== Words =====*/}
      <div className="order-2 lg:order-1 lg:col-span-7">
        {/* Two unbreakable halves: on phones the line breaks after the comma, not inside the first clause. */}
        <h1 id="help-title" className={`${DISPLAY_HEADING} text-h1 text-balance`}>
          <span className="inline-block">{m.help_header_title_a()}</span>{" "}
          <span className="inline-block">{m.help_header_title_b()}</span>
        </h1>
        <p className="mt-4 max-w-md text-lead text-pretty text-muted-foreground">{m.help_header_lead()}</p>
      </div>

      {/*===== Stage =====*/}
      <div className="relative order-1 h-[14.5rem] lg:order-2 lg:col-span-5 lg:h-[22rem]">
        {/* A pool of warm light where he stands. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_58%_70%,rgb(255_194_26/0.08),transparent)]"
        />

        {/*------ Board, Bush and Path ------*/}
        <div aria-hidden>
          <MascotCut
            name="board"
            eager
            className="absolute bottom-[0.9rem] left-0 w-[72%] translate-y-[6%] lg:bottom-[1.2rem] lg:w-[76%]"
          />
          <MascotCut
            name="plants"
            eager
            className="lively-sway-2 absolute bottom-[0.9rem] left-[82%] w-[16%] translate-y-[6%] -scale-x-100 lg:bottom-[1.2rem] lg:left-[84%] lg:w-[15%]"
          />
          <GroundStrip className="absolute inset-x-0 bottom-0 h-7 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] lg:h-9" />
        </div>

        {/*------ Dog ------*/}
        <MascotCut
          name="think"
          eager
          className="lively-breathe absolute bottom-[0.9rem] left-[58%] h-[7.5rem] w-auto -translate-x-1/2 lg:bottom-[1.2rem] lg:h-56"
        />

        {/*------ Bubble ------*/}
        {/* Its tail is 36px in from its right edge, so its right edge sits 36px past the dog's centre; the tail then
            points down at his head. */}
        <ChalkBubble
          tail="right"
          className="hp-pop absolute right-[calc(42%-36px)] bottom-[calc(0.9rem+7.5rem+0.5rem)] lg:bottom-[calc(1.2rem+14rem+1.6rem)]"
        >
          {m.help_header_bubble()}
        </ChalkBubble>
      </div>

      {/* The page's one load moment: the thinking dog's bubble pops from its tail (bottom right, 36px in). Off for
          reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .hp-pop {
            transform-origin: calc(100% - 36px) 100%;
            animation: answer-pop .38s cubic-bezier(.3,1.45,.5,1) .5s both;
          }
        }
      `}</style>
    </section>
  );
}
