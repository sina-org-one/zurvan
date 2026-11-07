import { cn } from "cn";

import { ChalkBubble } from "~/components/chalk-bubble";
import { EvaluationButton } from "~/components/evaluation-button";
import { GroundStrip } from "~/components/ground-strip";
import { MascotCut } from "~/components/mascot-cut";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Ask Tile =====*/
/**
 * The list's last tile, and the page's ask: a question the posts didn't answer goes to Zurvan's trainers, through the free
 * evaluation. It fills whatever the last row of cards leaves (one column beside two cards, a whole row under three or
 * under the lead alone), so the grid never has a hole, and it shapes itself to its own width: stacked in one column,
 * words beside the stage when it is wide (a container query).
 *
 * The stage: the dog trots to the mailbox with a letter in his mouth, on a strip of path between two bushes, a pool of
 * warm light where he walks. His picture faces right, so the stage is in logical sides and mirrored on English pages.
 */
export function AskTile({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <section
      aria-labelledby="blog-ask-title"
      style={style}
      className={cn(
        "@container overflow-hidden rounded-3xl border border-foreground/15 bg-sunken paper-grain shadow-sm",
        className,
      )}
    >
      <div className="flex h-full flex-col @xl:flex-row-reverse @xl:items-stretch">
        {/*------ Stage ------*/}
        <div className="relative h-60 shrink-0 @xl:h-auto @xl:min-h-64 @xl:w-[42%]">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_45%_80%,rgb(255_194_26/0.09),transparent)]"
          />
          <div aria-hidden>
            <GroundStrip className="absolute inset-x-0 bottom-0 h-8 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]" />
            <MascotCut name="mailbox" className="absolute end-[14%] bottom-[1rem] w-[22%] max-w-24 translate-y-[4%]" />
            <MascotCut
              name="plants"
              className="lively-sway absolute start-[2%] bottom-[1rem] w-[16%] max-w-20 translate-y-[6%]"
            />
            <MascotCut
              name="plants"
              className="lively-sway-2 absolute end-[-2%] bottom-[1rem] w-[13%] max-w-16 translate-y-[6%] -scale-x-100"
            />
          </div>
          <MascotCut
            name="letter"
            className="lively-hop absolute start-[22%] bottom-[1rem] h-36 w-auto translate-y-[3%] ltr:-scale-x-100"
          />
          <ChalkBubble
            tail="start"
            className="lively-reveal-pop absolute start-[calc(22%+1.6rem)] top-5 max-w-[min(15rem,70%)] text-pretty"
          >
            {m.blog_index_ask_bubble()}
          </ChalkBubble>
        </div>

        {/*------ Words ------*/}
        <div className="flex flex-1 flex-col justify-center p-5 pt-4 @xl:p-8">
          <h2 id="blog-ask-title" className={cn(DISPLAY_HEADING, "text-2xl text-balance @xl:text-[1.75rem]")}>
            {m.blog_index_ask_title()}
          </h2>
          <p className="mt-2 text-sm leading-7 text-pretty text-muted-foreground @xl:text-base @xl:leading-8">
            {m.blog_index_ask_text()}
          </p>
          <EvaluationButton className="mt-5 h-12 w-full @xl:w-auto @xl:self-start" />
        </div>
      </div>
    </section>
  );
}
