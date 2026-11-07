import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { CENTER } from "~/lib/contact";
import { familyMascotPose } from "~/lib/course-mascot";
import { familiesWithCourses } from "~/lib/course-families";
import { ZURVAN_SINCE } from "~/lib/head-trainer";
import { formatNumber } from "~/lib/locale-format";
import { pageHead } from "~/lib/seo";
import { m } from "~/paraglide/messages";
import { orpc } from "~/orpc/client";
import { AboutClosing } from "~/routes/about/components/about-closing";
import { AboutFacts } from "~/routes/about/components/about-facts";
import { AboutHero } from "~/routes/about/components/about-hero";
import { AboutLineup } from "~/routes/about/components/about-lineup";
import { AboutTrainers } from "~/routes/about/components/about-trainers";

/*===== Route =====*/
// Public. The only data is which course families exist, for the «what I learn at Zurvan» lineup (a family with no
// course gets no dog, so no link leads to an empty catalogue). If the course list can't be read the lineup is left
// out and the rest of the page, which is all fixed facts, still renders: the loader swallows the failure.
export const Route = createFileRoute("/_public/about")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(orpc.course.list.queryOptions()).catch(() => undefined);
  },
  head: () =>
    pageHead({
      path: "/about",
      title: m.about_meta_title(),
      description: m.about_meta_description({
        years: formatNumber(ZURVAN_SINCE.years),
        area: CENTER.serviceArea,
      }),
    }),
  component: AboutPage,
});

/*===== Page =====*/
// «درباره‌ی زروان»: since 2026-11-06 the page is about the center, not one person (the center may have several
// trainers). What Zurvan is and teaches, its facts, its trainers (`TRAINERS`) and the families it teaches. Every fact
// comes from the owner's business card and messages (`head-trainer.ts`, `contact.ts`); no biography, no invented
// trainer and no claim beyond the formats the owner lists.
function AboutPage() {
  // Not a suspense read, so a failed list leaves the lineup out instead of failing the page; the loader has already put
  // the list in the cache for the server render.
  const { data: courses = [] } = useQuery(orpc.course.list.queryOptions());
  const families = familiesWithCourses(courses).map(({ family, label }) => ({
    family,
    label,
    pose: familyMascotPose(family),
  }));

  return (
    <>
      <AboutHero />
      <AboutFacts />
      <AboutTrainers />
      {families.length > 0 && <AboutLineup families={families} />}
      <AboutClosing />
    </>
  );
}
