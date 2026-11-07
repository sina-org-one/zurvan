import { useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { z } from "zod";

import { describeBreed } from "~/lib/dog-format";
import { pageHead } from "~/lib/seo";
import { requireSession } from "~/lib/session-guard";
import { orpc } from "~/orpc/client";
import type { Dog } from "~/orpc/dog/contract";
import type { Evaluation } from "~/orpc/evaluation/contract";
import { m } from "~/paraglide/messages";
import { dogsQuery, evaluationsQuery } from "~/routes/assessment/queries";
import { COLUMN } from "~/routes/assessment/column";
import { AssessmentError } from "~/routes/assessment/components/assessment-error";
import { ChalkDefs } from "~/routes/assessment/components/chalk-defs";
import type { DogChoice } from "~/routes/assessment/components/dog-picker";
import { GuidePanel } from "~/routes/assessment/components/guide-panel";
import type { RoadStep } from "~/routes/assessment/components/header-road";
import { NoDogsPlate } from "~/routes/assessment/components/no-dogs-plate";
import { NothingToAskPlate } from "~/routes/assessment/components/nothing-to-ask-plate";
import { PageHeader } from "~/routes/assessment/components/page-header";
import { PageMotion } from "~/routes/assessment/components/page-motion";
import { RequestForm } from "~/routes/assessment/components/request-form";
import { RequestReceipt } from "~/routes/assessment/components/request-receipt";
import { guideFor, type GuideMood } from "~/routes/assessment/guide";

/*===== Search =====*/
// «معرفی سگ تازه» sends the owner back with the new dog's id (`?dog=`). A bad value is dropped rather than failing the
// page.
const assessmentSearchSchema = z.object({ dog: z.string().optional().catch(undefined) });

/*===== Route =====*/
export const Route = createFileRoute("/_public/assessment")({
  // A dog owner asks for the evaluation. Signed out goes to sign in and back here; partners and the Admin go to their
  // own home (docs/app-spec.md, Roles).
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  validateSearch: assessmentSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([queryClient.ensureQueryData(dogsQuery()), queryClient.ensureQueryData(evaluationsQuery())]);
  },
  head: () =>
    pageHead({
      path: "/assessment",
      title: m.assessment_meta_title(),
      description: m.assessment_meta_description(),
    }),
  component: EvaluationRequestPage,
  notFoundComponent: () => <AssessmentError notFound />,
  errorComponent: () => <AssessmentError notFound={false} />,
});

/*===== Who Can Ask =====*/
/**
 * F3: a dog with a waiting or an evaluated request can't ask again; one whose requests were all rejected or withdrawn
 * can. The dog's own flag counts too: it is also set for a dog the Admin marked evaluated.
 */
function toChoices({ dogs, evaluations }: { dogs: readonly Dog[]; evaluations: readonly Evaluation[] }): DogChoice[] {
  return dogs.map((dog) => {
    const own = evaluations.filter((evaluation) => evaluation.dog.id === dog.id);
    const state = own.some((evaluation) => evaluation.status === "requested")
      ? "pending"
      : dog.isEvaluated || own.some((evaluation) => evaluation.status === "evaluated")
        ? "evaluated"
        : "requestable";
    return { id: dog.id, name: dog.name, breed: describeBreed(dog), photo: dog.photo, state };
  });
}

/*===== Timing =====*/
/** How long the form's plates take to fade out before the receipt takes their place (`as-leave`). */
const LEAVE_MS = 260;

/*===== Evaluation Request =====*/
/**
 * F3's request page. The idea: the center's dog takes the request to the center's trainer. The start column has the
 * heading with the road of four stops, then the form as three numbered plates; the end column (sticky on a laptop) is
 * the guide, the dog whose pose and line follow the form, and «بعدش چی می‌شه؟». On a phone the guide is a compact band
 * over the plates, and the plates' own dogs take over from it. Once sent, the plates give way in place to the receipt,
 * the heading becomes «درخواستت رسید» and the road walks on to the call.
 *
 * Without a dog to ask for there is no form: a plate says why, with one way on (no dogs: introduce one; none left: the
 * Dashboard).
 */
function EvaluationRequestPage() {
  const [{ data: ownDogs }, { data: evaluations }] = useSuspenseQueries({
    queries: [dogsQuery(), evaluationsQuery()],
  });
  const dogs = toChoices({ dogs: ownDogs, evaluations });
  const queryClient = useQueryClient();

  /*------ ?dog= ------*/
  // Only used when that dog is theirs and can ask.
  const { dog: asked } = Route.useSearch();
  const preselectedDogId = dogs.find((dog) => dog.id === asked && dog.state === "requestable")?.id ?? null;

  const [guide, setGuide] = useState<{ mood: GuideMood; phonePlate1Failed: boolean }>({
    mood: "pick",
    phonePlate1Failed: false,
  });
  const [sent, setSent] = useState<Evaluation | null>(null);
  // The request went through and the plates are fading out.
  const [leaving, setLeaving] = useState(false);
  // A new key remounts the form, so «another dog» starts from a clean one.
  const [formKey, setFormKey] = useState(0);

  const requestable = dogs.filter((dog) => dog.state === "requestable");
  const defaultDogId =
    requestable.find((dog) => dog.id === preselectedDogId)?.id ?? (requestable.length === 1 ? requestable[0]!.id : "");

  /*------ Events ------*/
  // The dogs' states changed on the server (this one now has a request), so read them again: for «another dog» here, and
  // for every page that shows a dog's status.
  const refreshDogs = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.evaluation.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.dog.key() }),
      ]),
    [queryClient],
  );
  // The plates fade out first, then the receipt rises in their place (at once for reduced motion).
  const handleSent = useCallback(
    (evaluation: Evaluation) => {
      void refreshDogs();
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setLeaving(true);
      window.setTimeout(
        () => {
          setSent(evaluation);
          setLeaving(false);
        },
        still ? 0 : LEAVE_MS,
      );
    },
    [refreshDogs],
  );
  const handleAnotherDog = useCallback(() => {
    setSent(null);
    setGuide({ mood: "pick", phonePlate1Failed: false });
    setFormKey((key) => key + 1);
  }, []);
  const handleNotRequestable = useCallback(() => void refreshDogs(), [refreshDogs]);

  /*------ What Stands in the Form's Place ------*/
  const noDogs = dogs.length === 0;
  const nothingToAsk = !noDogs && requestable.length === 0 && !sent;
  const showForm = !noDogs && !nothingToAsk && !sent;

  /*------ The Road and the Guide ------*/
  const anyWaiting = dogs.some((dog) => dog.state === "pending");
  const step: RoadStep = noDogs ? 0 : sent ? 2 : nothingToAsk ? (anyWaiting ? 2 : 3) : 1;
  const mood: GuideMood = noDogs
    ? "noDogs"
    : nothingToAsk
      ? "nothing"
      : sent
        ? "sent"
        : leaving
          ? "sending"
          : guide.mood;
  // The phone band keeps his first line while the form is open (the plates' dogs take over there), except for a
  // failed submit whose first error is in plate ۱, the one without a dog of its own.
  const phoneMood: GuideMood = !showForm
    ? mood
    : guide.phonePlate1Failed && guide.mood === "failed"
      ? "failed"
      : "pick";

  return (
    <div className="overflow-x-clip">
      <PageMotion />
      <ChalkDefs />

      {/* The guide's words for screen readers, once per change (his bubbles are decoration). */}
      <p aria-live="polite" className="sr-only">
        {guideFor(mood).line}
      </p>

      <div
        className={`${COLUMN} grid grid-cols-[minmax(0,1fr)] pt-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-12 lg:pt-section-sm xl:gap-x-16`}
      >
        {/*===== Header =====*/}
        <div className="lg:col-start-1 lg:row-start-1">
          <PageHeader step={step} walkedFrom={sent ? 1 : null} sent={sent !== null} />
        </div>

        {/*===== Guide =====*/}
        {/* Phones: a compact band between the heading and the plates. Desktop: the sticky end column. */}
        <GuidePanel variant="phone" mood={phoneMood} className="mb-12 lg:hidden" />
        <aside
          aria-label={m.assessment_guide_label()}
          className="hidden lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:self-start"
        >
          <GuidePanel variant="desk" mood={mood} nextSteps={!sent} />
        </aside>

        {/*===== Form, or What Stands for It =====*/}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          {noDogs ? (
            <NoDogsPlate />
          ) : nothingToAsk ? (
            <NothingToAskPlate dogs={dogs} />
          ) : sent ? (
            <RequestReceipt
              evaluation={sent}
              anotherDogRequestable={requestable.some((dog) => dog.id !== sent.dog.id)}
              onAnotherDog={handleAnotherDog}
            />
          ) : (
            <div className={leaving ? "as-leave" : undefined}>
              <RequestForm
                key={formKey}
                dogs={dogs}
                defaultDogId={defaultDogId}
                locked={leaving}
                onGuideChange={setGuide}
                onSent={handleSent}
                onNotRequestable={handleNotRequestable}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
