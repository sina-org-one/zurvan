import { cn } from "cn";

import { EvaluationButton } from "~/components/evaluation-button";
import { Link } from "~/components/link";
import { MascotCut, type MascotCutName } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { buttonVariants } from "~/components/ui/button";
import { courseMascotLine, courseMascotPose } from "~/lib/course-mascot";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import type { BlogPost } from "~/orpc/blog/contract";
import { m } from "~/paraglide/messages";

type RelatedCourse = NonNullable<BlogPost["relatedCourse"]>;

/*===== Edge Dog =====*/
/**
 * The dog sitting on the closing card's top edge at its end corner, a bush either side and a pool of warm light, his
 * line in a bubble over his head. The card has no overflow clipping, so he sits over its edge, and the page leaves room
 * above the card for him and the sky. His picture faces right: at the end corner of a Persian page (the left) he looks
 * across the card; on English pages he is mirrored. He rises from behind the edge as the card scrolls into view.
 */
function EdgeDog({ pose, line }: { pose: MascotCutName; line: string }) {
  return (
    <>
      <div className="pointer-events-none absolute end-8 bottom-[calc(100%-0.25rem)] z-10 w-24 sm:end-12 lg:end-16 lg:w-32">
        <div
          aria-hidden
          className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_60%,rgb(255_194_26/0.08),transparent)]"
        />
        <MascotCut name="plants" className="lively-sway-2 absolute end-[86%] bottom-0 w-[52%] translate-y-[4%]" />
        <MascotCut
          name="plants"
          className="lively-sway absolute start-[88%] bottom-0 w-[44%] translate-y-[4%] -scale-x-100"
        />
        <div className="ba-edge">
          <MascotCut name={pose} className="lively-breathe relative block w-full translate-y-[3%] ltr:-scale-x-100" />
        </div>

        {/* Over his head whatever the pose's height; the tail is 2.25rem in from the bubble's end edge, so that edge
            sits 2.25rem past his middle. */}
        <p className="lively-reveal-pop absolute end-[calc(50%-2.25rem)] bottom-[calc(100%+0.5rem)] w-max max-w-[min(16rem,70vw)] rounded-[1.4rem] border-2 border-foreground bg-background px-4 py-2.5 font-hand text-[15px] leading-snug text-pretty text-foreground md:text-lg">
          {line}
          <span
            aria-hidden
            className="absolute end-7 -bottom-[9px] size-4 rotate-45 border-r-2 border-b-2 border-foreground bg-background"
          />
        </p>
      </div>
      {/* The chalk sky over the card's empty stretch at the start side. */}
      <NightSky className="start-[8%] bottom-[calc(100%+1.5rem)] h-24 w-[30%] md:h-28 lg:w-[34%]" />
    </>
  );
}

/*===== Course Card =====*/
/**
 * The course the author tied to the post: its cover, title and summary, and the way to its page. The dog is the
 * course's own pose and line, as on the course's page, so the course is recognised by its dog.
 */
function CourseClosing({ course }: { course: RelatedCourse }) {
  // The post knows the course's slug, not its family; an unplanned slug falls back to the friendly sit, which is the
  // basics family's pose anyway.
  const pose = courseMascotPose({ slug: course.slug, family: "basics" });

  return (
    <section
      aria-labelledby="post-closing-title"
      className="relative rounded-4xl border border-border bg-card paper-grain p-5 shadow-sm sm:p-8 lg:p-10"
    >
      <EdgeDog pose={pose} line={courseMascotLine(pose)} />

      <h2 id="post-closing-title" className={cn(DISPLAY_HEADING, "text-h3 text-balance")}>
        {m.blog_article_closing_course_title()}
      </h2>

      <div className="group/course relative mt-5 grid gap-5 rounded-3xl border border-foreground/15 bg-sunken p-3 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring/50 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center sm:gap-7 sm:p-4">
        <div className="overflow-hidden rounded-2xl">
          <img
            src={course.cover.src}
            alt={course.cover.alt}
            width={course.cover.width}
            height={course.cover.height}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] h-auto w-full object-cover transition-transform duration-700 motion-safe:group-hover/course:scale-[1.04]"
          />
        </div>
        <div className="px-1 pb-2 sm:px-0 sm:pb-0">
          <h3 className="text-xl font-extrabold text-balance text-primary md:text-2xl">{course.title}</h3>
          <p className="mt-2 text-pretty text-muted-foreground">{course.summary}</p>
          {/* Stretched over the whole row: the photo and the words are one target. */}
          <Link
            to="/courses/$slug"
            params={{ slug: course.slug }}
            className={buttonVariants({
              variant: "solid",
              size: "lg",
              className: "mt-5 w-full outline-none after:absolute after:inset-0 after:content-[''] sm:w-auto",
            })}
          >
            {m.blog_article_closing_course_button()}
          </Link>
        </div>
      </div>
    </section>
  );
}

/*===== Evaluation Card =====*/
/** Without a related course, the post ends where every road on the site does: the free evaluation at Zurvan. */
function EvaluationClosing() {
  return (
    <section
      aria-labelledby="post-closing-title"
      className="relative rounded-4xl border border-border bg-card paper-grain px-6 py-10 shadow-sm sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-12"
    >
      <EdgeDog pose="sit" line={m.blog_article_closing_eval_bubble()} />

      <div className="max-w-xl">
        <h2 id="post-closing-title" className={cn(DISPLAY_HEADING, "text-h2 text-balance")}>
          {m.blog_article_closing_eval_title()}
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">{m.blog_article_closing_eval_text()}</p>
      </div>
      <EvaluationButton className="mt-8 h-14 w-full shrink-0 lg:mt-0 lg:w-auto" />
    </section>
  );
}

/*===== Article Closing =====*/
/** The post's last word: the related course while it is on sale, else the free evaluation. */
export function ArticleClosing({ relatedCourse }: { relatedCourse: BlogPost["relatedCourse"] }) {
  return relatedCourse ? <CourseClosing course={relatedCourse} /> : <EvaluationClosing />;
}
