import { createFileRoute } from "@tanstack/react-router";

import { GroundStrip } from "~/components/ground-strip";
import { CENTER } from "~/lib/contact";
import { ZURVAN_SINCE } from "~/lib/head-trainer";
import { formatNumber } from "~/lib/locale-format";
import { pageHead } from "~/lib/seo";
import { StoryClosing } from "~/routes/home/components/story-closing";
import { StoryFormats } from "~/routes/home/components/story-formats";
import { StoryHero } from "~/routes/home/components/story-hero";
import { StoryRunner } from "~/routes/home/components/story-runner";
import { StoryTeach } from "~/routes/home/components/story-teach";
import { StoryTrail } from "~/routes/home/components/story-trail";
import { StoryTrainers } from "~/routes/home/components/story-trainers";
import { m } from "~/paraglide/messages";

/*===== Route =====*/
export const Route = createFileRoute("/_public/")({
  // In the page's language, with its canonical address and the other language's (`~/lib/seo`).
  head: () =>
    pageHead({
      path: "/",
      title: m.home_meta_title(),
      description: m.home_meta_description({
        years: formatNumber(ZURVAN_SINCE.years),
        area: CENTER.serviceArea,
      }),
    }),
  // The closing scene's dog stands on the footer's top edge, so there is no gap above it.
  staticData: { flushFooter: true },
  component: HomePage,
});

/*===== Page =====*/
/**
 * The mascot-led home page: Fandogh, a cartoon Belgian Malinois, lives in the layout and talks to the visitor in
 * chalk bubbles, from the hero's bark to the closing «بریم؟». The storefront shell draws the header, footer and tab bar.
 */
function HomePage() {
  return (
    <>
      <StoryHero />
      {/* Pulled up over the hero's bottom edge, so its card stands on the path. Not on phones, where it crowds the
          card's edge under the dog's paws (the owner's call, 2026-10-20). */}
      <GroundStrip className="z-10 -mt-7 max-sm:hidden md:-mt-9" />
      <StoryTrail />
      <StoryRunner />
      <StoryTeach />
      <StoryFormats />
      <StoryTrainers />
      <StoryClosing />
    </>
  );
}
