import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";

import { Link } from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { orNotFound } from "~/lib/not-found";
import { pageHead } from "~/lib/seo";
import { orpc } from "~/orpc/client";
import type { Course } from "~/orpc/course/contract";
import type { SessionState } from "~/orpc/session/contract";
import { m } from "~/paraglide/messages";
import { BuyCard } from "~/routes/course_detail/components/buy-card";
import { ClosingBand } from "~/routes/course_detail/components/closing-band";
import { CourseHero } from "~/routes/course_detail/components/course-hero";
import { LaneRail } from "~/routes/course_detail/components/lane-rail";
import { LearnSection } from "~/routes/course_detail/components/learn-section";
import { PhoneActionBar } from "~/routes/course_detail/components/phone-action-bar";
import { useBuyCard, type Viewer } from "~/routes/course_detail/components/use-buy-card";
import { COLUMN } from "~/routes/course_detail/column";
import { getLane } from "~/routes/course_detail/lane";

/*===== Route =====*/
// Public: a visitor reads the course, so there is no guard. The session is only read to know who is looking.
// Working and sport dogs (`/courses/working-dogs`, `/courses/sport`) are course rows too, so they land here.
export const Route = createFileRoute("/_public/courses/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    const [course, , session] = await Promise.all([
      orNotFound(queryClient.ensureQueryData(orpc.course.get.queryOptions({ input: { slug: params.slug } }))),
      queryClient.ensureQueryData(orpc.course.list.queryOptions()),
      queryClient.ensureQueryData(orpc.session.get.queryOptions()),
    ]);

    if (canBuy({ viewer: toBuyViewer(session), course })) {
      await queryClient.ensureQueryData(orpc.checkout.eligibility.queryOptions({ input: { courseSlug: course.slug } }));
    }
    return { title: course.title, summary: course.summary };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? pageHead({
          path: `/courses/${params.slug}`,
          title: m.course_detail_meta_title({ title: loaderData.title }),
          description: loaderData.summary,
        })
      : { meta: [{ title: m.course_detail_meta_not_found() }] },
  // The closing band, a brick wall, runs straight into the footer.
  staticData: { flushFooter: true },
  component: CourseDetailPage,
  notFoundComponent: () => <CourseError missing />,
  errorComponent: () => <CourseError missing={false} />,
});

/*===== Viewer =====*/
/**
 * Who is looking, for the buy card. A customer who hasn't given a name yet is still finishing sign-up: for this page
 * they are a visitor, and the sign-in page asks for the name before sending them back here. A blocked account reads as
 * signed out.
 */
function toBuyViewer(session: SessionState): Viewer {
  if (session.status === "anonymous") return "visitor";
  // A partner can be a customer too (the owner, 2026-11-07).
  if (session.user.role !== "customer" && session.user.role !== "partner") return "other";
  return session.status === "active" ? "customer" : "visitor";
}

/** Only a customer, and only for a course that has a price (a working or sport course isn't sold online). */
function canBuy({ viewer, course }: { viewer: Viewer; course: Pick<Course, "price"> }) {
  return viewer === "customer" && course.price !== null;
}

/*===== Page =====*/
function CourseDetailPage() {
  const { slug } = Route.useParams();
  const { data: course } = useSuspenseQuery(orpc.course.get.queryOptions({ input: { slug } }));
  const { data: catalogue } = useSuspenseQuery(orpc.course.list.queryOptions());
  const { data: session } = useSuspenseQuery(orpc.session.get.queryOptions());
  const viewer = toBuyViewer(session);
  // Conditional, so not a suspense read; the loader has already put it in the cache for the server render.
  const { data: eligibility = [] } = useQuery({
    ...orpc.checkout.eligibility.queryOptions({ input: { courseSlug: course.slug } }),
    enabled: canBuy({ viewer, course }),
  });
  const lane = getLane({ course, catalogue });
  // The card and the phone bar draw the same state, so it is worked out once here.
  const buy = useBuyCard({ course, viewer, eligibility });
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/*===== Hero and Buy Card =====*/}
      <CourseHero course={course}>
        <BuyCard course={course} buy={buy} cardRef={cardRef} />
      </CourseHero>

      {/*===== What You Learn and What Comes Next =====*/}
      {/* 7/5 when the lane has something to say; a course with no lane content (CGC, working dogs) gets the whole width
          rather than an empty end column. `LaneRail` renders nothing for those, so the grid asks for its heading. */}
      <div
        className={`${COLUMN} grid gap-y-section-sm pt-section-sm lg:has-[#lane-title]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:has-[#lane-title]:gap-x-16 xl:has-[#lane-title]:gap-x-24`}
      >
        <LearnSection course={course} />
        {lane && <LaneRail course={course} lane={lane} />}
      </div>

      {/*===== Closing =====*/}
      {/* Room above the band for the dog sitting on it. */}
      <div className="mt-48 md:mt-56">
        <ClosingBand />
      </div>

      <PhoneActionBar course={course} buy={buy} cardRef={cardRef} />
    </>
  );
}

/*===== Error Boundary =====*/
// Renders inside the public layout, so a mistyped course link still has the header, footer and a way on.
function CourseError({ missing }: { missing: boolean }) {
  return (
    <section aria-labelledby="course-error-title" className={`${COLUMN} py-section-md`}>
      <div className="max-w-xl">
        <h1 id="course-error-title" className={`${DISPLAY_HEADING} text-h1 text-balance`}>
          {missing ? m.course_detail_error_missing_title() : m.course_detail_error_broken_title()}
        </h1>
        <p className="mt-4 text-lead text-pretty text-muted-foreground">
          {missing ? m.course_detail_error_missing_text() : m.course_detail_error_broken_text()}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/courses" className={buttonVariants({ variant: "solid", size: "lg" })}>
            {m.course_detail_error_all_courses()}
          </Link>
          <Link to="/assessment" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {m.course_detail_error_evaluation()}
          </Link>
        </div>
      </div>
    </section>
  );
}
