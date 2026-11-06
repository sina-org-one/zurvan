import { cn } from "cn";

import { BLOG_COLUMN } from "~/components/blog/column";
import { BrandEmblem } from "~/components/brand-emblem";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { CENTER } from "~/lib/contact";
import { m } from "~/paraglide/messages";

/*===== Blog Header =====*/
/**
 * The page's top: «نوشته‌های زروان», one line on what Zurvan's trainers write about and the center's emblem and name
 * (the posts are the center's notes since 2026-11-06; each post still names its author), beside the reading corner:
 * the dog lies on the shelf's coping with an open book, in front of the dimmed writing desk where the posts are written,
 * under a chalk night sky, a bush either side and a pool of warm light, and says he has read them all.
 *
 * The block has no bottom padding on the stage's side: the shelf follows it with nothing between, so the dog lies on
 * its coping (the picture is sunk a few percent so its soft edge disappears into the stone). The stage is laid out in
 * logical sides: the dog lies nearest the words and looks at them (his picture faces right, so it is mirrored on the
 * English pages).
 *
 * The page's one load moment (`bi-*`): he rises from behind the coping, then his bubble pops.
 */
export function BlogHeader() {
  return (
    <section
      aria-labelledby="blog-title"
      className={cn(BLOG_COLUMN, "grid items-end pt-6 md:grid-cols-12 md:gap-x-8 md:pt-section-sm lg:gap-x-10")}
    >
      {/*===== Words =====*/}
      <div className="pb-6 md:col-span-7 md:pb-14">
        <h1 id="blog-title" className={cn(DISPLAY_HEADING, "text-[2rem] text-balance md:text-[3.25rem]")}>
          {m.blog_index_title()}
        </h1>
        <p className="mt-3 max-w-lg text-[0.95rem] leading-8 text-pretty text-muted-foreground md:mt-4 md:text-lead">
          {m.blog_index_text()}
        </p>

        {/*------ Byline ------*/}
        <p className="mt-5 flex items-center gap-3 md:mt-7">
          <BrandEmblem className="size-12" />
          <span className="flex flex-col leading-snug">
            <span className="font-bold">{CENTER.name}</span>
            <span className="text-sm text-muted-foreground">{CENTER.descriptor}</span>
          </span>
        </p>
      </div>

      {/*===== Reading Corner =====*/}
      <div className="@container relative h-[11.5rem] md:col-span-5 md:h-[17rem]">
        <div
          aria-hidden
          className="absolute -inset-x-6 inset-y-0 bg-[radial-gradient(ellipse_45%_55%_at_38%_90%,rgb(255_194_26/0.09),transparent)] ltr:bg-[radial-gradient(ellipse_45%_55%_at_62%_90%,rgb(255_194_26/0.09),transparent)]"
        />
        <NightSky className="end-[2%] top-1 h-16 w-[34%] md:top-4 md:h-24" />

        <div aria-hidden>
          <MascotCut
            name="desk"
            eager
            className="absolute end-[6%] bottom-0 w-[34%] max-w-48 translate-y-[3%] ltr:-scale-x-100"
          />
          <MascotCut
            name="plants"
            eager
            className="lively-sway absolute start-[-3%] bottom-0 w-[15%] max-w-20 translate-y-[3%]"
          />
          <MascotCut
            name="plants"
            eager
            className="lively-sway-2 absolute end-[-4%] bottom-0 w-[13%] max-w-16 translate-y-[3%] -scale-x-100"
          />
          <div className="bi-dog absolute start-[8cqw] bottom-0 w-[min(50cqw,16rem)]">
            <MascotCut name="read" eager className="lively-breathe block w-full translate-y-[4%] ltr:-scale-x-100" />
          </div>
        </div>

        {/* Placed in the stage's own width (`cqw`), as the dog is: his head is about 30% in from his picture's start
            edge and the bubble's tail 2.75rem in from its own, so the tail sits over his head, just above it. */}
        <p className="bi-pop absolute start-[calc(8cqw+min(50cqw,16rem)*0.3-2.75rem)] bottom-[calc(min(50cqw,16rem)*0.69+0.4rem)] w-max max-w-[min(16rem,80%)] rounded-[1.4rem] border-2 border-foreground bg-background px-4 py-2.5 font-hand text-[15px] leading-snug text-pretty text-foreground md:text-lg">
          {m.blog_index_bubble()}
          <span
            aria-hidden
            className="absolute start-9 -bottom-[9px] size-4 rotate-45 border-r-2 border-b-2 border-foreground bg-background"
          />
        </p>
      </div>

      {/* The load moment: he rises from behind the coping (the clip moves with him so nothing shows below it), then the
          bubble pops from its tail and settles into the shared float. Off for reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .bi-dog { animation: bi-rise .85s cubic-bezier(.2,.8,.25,1) .15s both; }
          .bi-pop {
            transform-origin: 2.75rem 100%;
            animation: answer-pop .38s cubic-bezier(.3,1.45,.5,1) .85s both, lively-float 3.4s ease-in-out 1.3s infinite alternate;
          }
          .bi-pop:dir(rtl) { transform-origin: calc(100% - 2.75rem) 100%; }
        }
        @keyframes bi-rise {
          0% { transform: translateY(85%); clip-path: inset(-30% -30% 100% -30%); }
          78% { transform: translateY(-3%); clip-path: inset(-30% -30% 0 -30%); }
          100% { transform: none; clip-path: inset(-30% -30% -10% -30%); }
        }
      `}</style>
    </section>
  );
}
