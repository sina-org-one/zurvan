import { cn } from "cn";

import { ChalkBubble } from "~/components/chalk-bubble";
import { EvaluationButton } from "~/components/evaluation-button";
import { GroundStrip } from "~/components/ground-strip";
import { Link } from "~/components/link";
import { MascotCut, type MascotCutName } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { buttonVariants } from "~/components/ui/button";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";
import { WithQuery } from "~/routes/blog_index/components/with-query";

/*===== Empty State =====*/
// What replaces the list when it is empty, truthfully for why: there are no posts at all, none in the chosen section,
// or the search found nothing (a search wins over a section, since clearing it is the way out). The dog carries each:
// lying watchful by the writing desk waiting for the first post, nose to the ground where the section is empty, with
// his magnifying glass by the notice board when a search found nothing.
export type EmptyKind = { kind: "none" } | { kind: "category"; label: string } | { kind: "query"; query: string };

type Stage = { dog: MascotCutName; dogClass: string; scenery: MascotCutName; sceneryClass: string; bubble: string };

function stageFor(empty: EmptyKind): Stage {
  switch (empty.kind) {
    case "none":
      return {
        dog: "watch",
        dogClass: "start-[10%] w-[52%] max-w-64",
        scenery: "desk",
        sceneryClass: "end-[6%] w-[34%] max-w-44",
        bubble: m.blog_index_empty_none_bubble(),
      };
    case "category":
      return {
        dog: "sniff",
        dogClass: "start-[12%] w-[50%] max-w-64",
        scenery: "bone",
        sceneryClass: "end-[10%] w-[24%] max-w-32",
        bubble: m.blog_index_empty_category_bubble(),
      };
    case "query":
      return {
        dog: "magnify",
        dogClass: "start-[18%] w-[30%] max-w-40",
        scenery: "board",
        sceneryClass: "end-[2%] w-[48%] max-w-64",
        bubble: m.blog_index_empty_query_bubble(),
      };
  }
}

/**
 * A grained plate: the dog's stage (on the end side wide, on top on phones) and the words with the way out. The words
 * rise in and the bubble pops each time the reason changes (the page keys it).
 */
export function EmptyState({ empty }: { empty: EmptyKind }) {
  const stage = stageFor(empty);

  return (
    <section
      aria-labelledby="blog-empty-title"
      className="grid overflow-hidden rounded-4xl border border-border bg-card paper-grain shadow-sm md:grid-cols-12"
    >
      {/*------ Stage ------*/}
      <div className="relative h-56 md:order-2 md:col-span-5 md:h-auto md:min-h-72">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_45%_82%,rgb(255_194_26/0.09),transparent)]"
        />
        <NightSky className="end-[6%] top-3 h-14 w-[28%]" />
        <div aria-hidden>
          <GroundStrip className="absolute inset-x-0 bottom-0 h-8 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]" />
          <MascotCut
            name={stage.scenery}
            className={cn("absolute bottom-[1rem] translate-y-[5%] ltr:-scale-x-100", stage.sceneryClass)}
          />
          <MascotCut
            name="plants"
            className="lively-sway absolute start-[-2%] bottom-[1rem] w-[14%] max-w-16 translate-y-[6%]"
          />
        </div>
        <MascotCut
          name={stage.dog}
          className={cn(
            "lively-breathe absolute bottom-[1rem] h-auto translate-y-[4%] ltr:-scale-x-100",
            stage.dogClass,
          )}
        />
        <ChalkBubble
          tail="start"
          className="answer-pop absolute start-[8%] top-5 max-w-[min(15rem,80%)] text-pretty [--answer-delay:0.25s] [--pop-origin:calc(100%-2.25rem)_100%] ltr:[--pop-origin:2.25rem_100%]"
        >
          {stage.bubble}
        </ChalkBubble>
      </div>

      {/*------ Words ------*/}
      <div className="answer-in flex flex-col justify-center p-6 sm:p-10 md:order-1 md:col-span-7 lg:p-14">
        <h2
          id="blog-empty-title"
          dir="auto"
          className={cn(DISPLAY_HEADING, "text-h3 text-balance [overflow-wrap:anywhere]")}
        >
          {empty.kind === "none" && m.blog_index_empty_none_title()}
          {empty.kind === "category" && m.blog_index_empty_category_title({ category: empty.label })}
          {empty.kind === "query" && (
            <WithQuery text={(mark) => m.blog_index_empty_query_title({ query: mark })} query={empty.query} />
          )}
        </h2>
        <p className="mt-3 max-w-lg text-pretty text-muted-foreground">
          {empty.kind === "none" && m.blog_index_empty_none_text()}
          {empty.kind === "category" && m.blog_index_empty_category_text()}
          {empty.kind === "query" && m.blog_index_empty_query_text()}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {empty.kind === "none" && <EvaluationButton className="h-14" />}
          {empty.kind === "category" && (
            <Link to="/blog" className={buttonVariants({ variant: "solid", size: "lg" })}>
              {m.blog_index_empty_all()}
            </Link>
          )}
          {empty.kind === "query" && (
            <>
              <Link
                to="/blog"
                search={(prev) => ({ ...prev, q: undefined })}
                replace
                resetScroll={false}
                className={buttonVariants({ variant: "solid", size: "lg" })}
              >
                {m.blog_index_search_clear()}
              </Link>
              <Link to="/assessment" className={buttonVariants({ variant: "outline", size: "lg" })}>
                {m.shared_evaluation_request()}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
