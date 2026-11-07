import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { cn } from "cn";
import { z } from "zod";

import { isShownFamily } from "~/lib/course-families";
import { pageHead } from "~/lib/seo";
import { requireSession } from "~/lib/session-guard";
import { orpc } from "~/orpc/client";
import { m } from "~/paraglide/messages";
import type { Dog } from "~/orpc/dog/contract";
import { splitCourses } from "~/routes/buy/buy-lists";
import { BuyError } from "~/routes/buy/components/buy-error";
import { BuyHero } from "~/routes/buy/components/buy-hero";
import { CanTakeSection } from "~/routes/buy/components/can-take-section";
import { CartBar } from "~/routes/buy/components/cart-bar";
import { GatePanel } from "~/routes/buy/components/gate-panel";
import { LaterSection } from "~/routes/buy/components/later-section";
import { NoDogsPanel } from "~/routes/buy/components/no-dogs-panel";
import { PageEnd } from "~/routes/buy/components/page-end";
import { PageMotion } from "~/routes/buy/components/page-motion";
import { PickFirstPanel } from "~/routes/buy/components/pick-first-panel";
import { useChanged } from "~/routes/buy/hooks/use-changed";
import { COLUMN } from "~/routes/buy/plate";
import { dogCoursesQuery, dogsQuery } from "~/routes/buy/queries";

/*===== Search =====*/
// The picked dog's id. A bad value is dropped (no dog picked) rather than failing the page.
const buySearchSchema = z.object({ dog: z.string().optional().catch(undefined) });

/*===== Route =====*/
/**
 * The purchase page that starts from the dog (docs/app-spec.md, F5). The dog is `?dog=<id>`; with exactly one dog it is
 * chosen already. The verdict for every course comes from the server's eligibility check, the same one the cart and
 * «پرداخت» use, so nothing is offered that couldn't be bought. A dog that isn't the customer's is just not picked.
 */
export const Route = createFileRoute("/_public/buy")({
  // Customers only. A visitor is sent to sign in and brought back here, the query string included (`requireSession`);
  // a partner or the Admin goes to their own home.
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  validateSearch: buySearchSchema,
  loaderDeps: ({ search }) => ({ dog: search.dog }),
  loader: async ({ context: { queryClient }, deps }) => {
    const [dogs] = await Promise.all([
      queryClient.ensureQueryData(dogsQuery()),
      queryClient.ensureQueryData(orpc.course.list.queryOptions()),
    ]);

    const dog = pickDog({ dogs, asked: deps.dog });
    if (dog) await queryClient.ensureQueryData(dogCoursesQuery(dog.id));
  },
  head: () => pageHead({ path: "/buy", title: m.buy_meta_title(), description: m.buy_meta_description() }),
  // The page lists someone's own dogs and what each can take, so no shared cache may keep it (the public layout sets
  // none).
  headers: () => ({ "Cache-Control": "private, no-store" }),
  // The page ends on a stretch of path that runs straight into the footer, so the public shell drops `main`'s bottom
  // padding.
  staticData: { flushFooter: true },
  component: BuyPage,
  notFoundComponent: () => <BuyError notFound />,
  errorComponent: () => <BuyError notFound={false} />,
});

/*===== Picked Dog =====*/
/** The dog the address asks for, or the only dog when there is just one; none for an id that isn't the customer's. */
function pickDog({ dogs, asked }: { dogs: Dog[]; asked: string | undefined }): Dog | undefined {
  return dogs.find((candidate) => candidate.id === asked) ?? (dogs.length === 1 ? dogs[0] : undefined);
}

/*===== Page =====*/
/**
 * «خرید دوره»: for people who know what they want (F5). The center's stall: the customer's dogs line up as prints, the
 * picked one steps forward, and the plates below show what fits it: «الان می‌تونه» (price and «افزودن به سبد») and
 * «بعداً باز می‌شن» (each reason and the way out), with a reason every course shares (no evaluation) lifted into a gate
 * first. Adding goes to the cart; «پرداخت» is there, behind the floating cart bar.
 *
 * Picking a dog is a navigation (`?dog=`): while it loads, the pressed print lifts at once (the pending location's dog)
 * and the plates below dim; when it lands, the h1 and the bubbles re-key and the plates arrive staggered. The page keeps
 * showing the last dog's search until the next dog's verdicts are in.
 */
function BuyPage() {
  const { dog: asked } = Route.useSearch();
  const { data: dogs } = useSuspenseQuery(dogsQuery());
  const { data: catalogue } = useSuspenseQuery(orpc.course.list.queryOptions());
  const dog = pickDog({ dogs, asked }) ?? null;
  const dogId = dog?.id ?? null;
  // Only with a dog picked, so not a suspense read; the loader has already put it in the cache.
  const { data: verdicts } = useQuery({
    ...dogCoursesQuery(dogId ?? ""),
    enabled: dogId !== null,
  });
  const courses = catalogue.filter((course) => isShownFamily(course.family));
  const lists = dog && verdicts ? splitCourses({ courses, verdicts, dogId: dog.id }) : null;
  const changed = useChanged(dogId ?? "none");

  /*------ The Dog Being Opened ------*/
  const pending = useRouterState({
    select: (state) =>
      state.status === "pending" && state.location.pathname === "/buy" ? state.location.search.dog : undefined,
  });
  const pendingDog = pending ? dogs.find((candidate) => candidate.id === pending) : undefined;
  const pickedId = pendingDog?.id ?? dogId;
  const loading = pendingDog !== undefined && pendingDog.id !== dogId;

  return (
    <>
      <PageMotion />

      {/*===== Hero: the Stall and the Line-up =====*/}
      <BuyHero
        dogs={dogs}
        pickedId={pickedId}
        dogName={dog?.name ?? null}
        pickBubble={dog && lists && !loading ? { dogId: dog.id, line: lists.line, changed } : null}
        changed={changed}
      />

      {/*===== What Fits =====*/}
      <div
        key={dogId ?? "none"}
        className={cn(
          COLUMN,
          "mt-10 flex flex-col gap-y-14 motion-safe:transition-opacity motion-safe:duration-300 lg:mt-14 lg:gap-y-20",
          loading && "opacity-45",
        )}
      >
        {dogs.length === 0 ? (
          <NoDogsPanel />
        ) : !dog || !lists ? (
          <PickFirstPanel />
        ) : (
          <>
            {lists.gate && <GatePanel gate={lists.gate} arrive={changed} />}
            {/* A dog with nothing to buy now has no offer plate: the gate (or the list of reasons) leads. */}
            {lists.canTake.length > 0 && (
              <CanTakeSection courses={lists.canTake} dogId={dog.id} dogName={dog.name} arrive={changed} />
            )}
            {lists.later.length > 0 && (
              <LaterSection
                rows={lists.later}
                gated={lists.gate !== null}
                arrive={changed}
                delay={lists.canTake.length > 0 ? 160 : 80}
              />
            )}
          </>
        )}
      </div>

      <PageEnd />
      <CartBar />
    </>
  );
}
