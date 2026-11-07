import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ChalkBubble } from "~/components/chalk-bubble";
import { GroundStrip } from "~/components/ground-strip";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { buttonVariants } from "~/components/ui/button";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { pageHead } from "~/lib/seo";
import { requireSession } from "~/lib/session-guard";
import { COLUMN } from "~/routes/account_home/column";
import { DogPanel } from "~/routes/account_home/components/dog-panel";
import { RoadChalk } from "~/routes/account_home/components/dog-road";
import { HomeHero } from "~/routes/account_home/components/home-hero";
import { NextStepsBand } from "~/routes/account_home/components/next-steps-band";
import { NoDogs } from "~/routes/account_home/components/no-dogs";
import { m } from "~/paraglide/messages";
import { buildCards, dogsQuery, enrollmentsQuery, evaluationsQuery } from "~/routes/account_home/queries";

/*===== Route =====*/
// The account layout lets partners in too, but my dogs, requests and courses are a customer's (docs/app-spec.md, Pages).
export const Route = createFileRoute("/account/")({
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(dogsQuery()),
      queryClient.ensureQueryData(evaluationsQuery()),
      queryClient.ensureQueryData(enrollmentsQuery()),
    ]);
  },
  head: () =>
    pageHead({
      path: "/account",
      title: m.account_home_meta_title(),
      description: m.account_home_meta_description(),
    }),
  // The page ends on its brick band, which runs straight into the footer: the account shell drops `main`'s bottom
  // padding for it.
  staticData: { flushFooter: true },
  component: AccountHomePage,
  notFoundComponent: () => <HomeError notFound />,
  errorComponent: () => <HomeError notFound={false} />,
});

/*===== Dashboard =====*/
/**
 * F2/F3/F6's customer home, «سگ‌های من»: the center's dog welcomes the customer in front of his friends' board, then one
 * panel per dog, each saying where the dog stands (its bubble and its road) and offering the one next step, and at
 * the end the brick band of what happens from here. Open requests and enrollments belong to their dog's panel instead
 * of sections of their own.
 */
function AccountHomePage() {
  const { user } = Route.useRouteContext();
  const { data: dogs } = useSuspenseQuery(dogsQuery());
  const { data: evaluations } = useSuspenseQuery(evaluationsQuery());
  const { data: enrollments } = useSuspenseQuery(enrollmentsQuery());
  const { cards, tally } = buildCards({ dogs, evaluations, enrollments });

  return (
    <>
      {/*===== Hero =====*/}
      <HomeHero firstName={user.firstName} tally={cards.length > 0 ? tally : null} />

      {/*===== Dogs =====*/}
      <div className={COLUMN}>
        {cards.length === 0 ? (
          <NoDogs />
        ) : (
          <div className="flex flex-col gap-6">
            <RoadChalk />
            {cards.map(({ dog, status, activeEnrollments }, index) => (
              <DogPanel key={dog.id} dog={dog} status={status} activeEnrollments={activeEnrollments} index={index} />
            ))}
          </div>
        )}
      </div>

      {/*===== What Happens From Here =====*/}
      <NextStepsBand />
    </>
  );
}

/*===== Error Boundary =====*/
// Inside the account shell, so a failed list still has the header, the footer and a way on.
function HomeError({ notFound }: { notFound: boolean }) {
  return (
    <section aria-labelledby="account-home-error-title" className={`${COLUMN} py-section-md`}>
      <div className="grid items-end gap-y-8 md:grid-cols-[minmax(0,34rem)_16rem] md:gap-x-16">
        {/*------ Words ------*/}
        <div className="max-w-xl md:pb-8">
          <h1 id="account-home-error-title" className={`${DISPLAY_HEADING} text-h1 text-balance`}>
            {notFound ? m.account_home_error_not_found() : m.account_home_error_failed()}
          </h1>
          <p className="mt-4 text-lead text-pretty text-muted-foreground">{m.account_home_error_description()}</p>
          <Link to="/" className={buttonVariants({ variant: "solid", size: "lg", className: "mt-7" })}>
            {m.account_home_error_home()}
          </Link>
        </div>

        {/*------ The Sorry Dog ------*/}
        {/* Physical sides: his bubble's tail is aimed at his head, which faces right. */}
        <div aria-hidden className="relative h-56">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_55%_at_50%_80%,rgb(255_194_26/0.08),transparent)]" />
          <GroundStrip className="absolute inset-x-0 bottom-0 h-7 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]" />
          <div className="absolute bottom-[0.9rem] left-1/2 w-28 -translate-x-1/2 translate-y-[3%]">
            <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[80%] w-[55%]" />
            <MascotCut name="plants" className="lively-sway-2 absolute right-[84%] bottom-0 w-[45%] -scale-x-100" />
            <MascotCut name="sorry" className="lively-breathe relative block w-full" />
          </div>
          <ChalkBubble tail="right" className="absolute top-0 right-[calc(50%-0.5rem)] text-pretty">
            {m.account_home_error_sorry()}
          </ChalkBubble>
        </div>
      </div>
    </section>
  );
}
