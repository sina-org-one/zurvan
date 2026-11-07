import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { getDogStatus } from "~/lib/dog-status";
import { orNotFound } from "~/lib/not-found";
import { PUBLIC_RECORD_CONSENT } from "~/lib/public-record";
import { pageHead } from "~/lib/seo";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/account_dog_detail/column";
import { BuddyCorner } from "~/routes/account_dog_detail/components/buddy-corner";
import { CertificatesSection } from "~/routes/account_dog_detail/components/certificates-section";
import { DogDetailError } from "~/routes/account_dog_detail/components/dog-detail-error";
import { DogHero } from "~/routes/account_dog_detail/components/dog-hero";
import { DogProfile } from "~/routes/account_dog_detail/components/dog-profile";
import { EnrollmentsSection } from "~/routes/account_dog_detail/components/enrollments-section";
import { EvaluationsSection } from "~/routes/account_dog_detail/components/evaluations-section";
import { FileCard } from "~/routes/account_dog_detail/components/file-card";
import { LogbookSection } from "~/routes/account_dog_detail/components/logbook-section";
import { MedalsBand } from "~/routes/account_dog_detail/components/medals-band";
import { PageMotion } from "~/routes/account_dog_detail/components/page-motion";
import { PublicRecordCard } from "~/routes/account_dog_detail/components/public-record-card";
import { dogDetailQueries } from "~/routes/account_dog_detail/queries";

/*===== Route =====*/
// The account shell guards the route. The API answers NOT_FOUND for another owner's dog too, so a made-up id and
// someone else's dog look the same: both are the page's 404.
export const Route = createFileRoute("/account/dogs/$dogId")({
  loader: async ({ context: { queryClient }, params }) => {
    const queries = dogDetailQueries(params.dogId);
    const [dog] = await orNotFound(
      Promise.all([
        queryClient.ensureQueryData(queries.dog),
        queryClient.ensureQueryData(queries.evaluations),
        queryClient.ensureQueryData(queries.enrollments),
        queryClient.ensureQueryData(queries.logbook),
        queryClient.ensureQueryData(queries.certificates),
        queryClient.ensureQueryData(queries.publicStatus),
      ]),
    );
    return { name: dog.name };
  },
  head: ({ loaderData, params }) =>
    pageHead({
      path: `/account/dogs/${params.dogId}`,
      title: loaderData
        ? m.account_dog_detail_meta_title({ name: loaderData.name })
        : m.account_dog_detail_meta_title_fallback(),
      // Without loader data the page is its error or not-found screen, so the description says that instead.
      description: loaderData
        ? m.account_dog_detail_meta_description({ name: loaderData.name })
        : m.account_dog_detail_error_notfound_text(),
    }),
  // The page ends on the medals' brick band, which runs into the footer, so the shell drops its bottom padding.
  staticData: { flushFooter: true },
  component: AccountDogDetailPage,
  notFoundComponent: () => <DogDetailError notFound />,
  errorComponent: () => <DogDetailError notFound={false} />,
});

/*===== Dog Detail =====*/
/**
 * F2, F3, F6 and F14 on one dog, as the dog's own room: its photo pinned as a big print beside its name (the hero), then
 * its courses, certificates, diary and evaluations in the main column and its profile and file card in a sticky side
 * column (phones: one column, main first), and at the end the medals of the courses it passed on a brick wall.
 *
 * The customer's dog is the photo and speaks its state; the center's dog keeps his buddy's file down the page (the
 * clipboard on the courses, the diploma by the certificates, writing the diary, waiting by the phone for the evaluation
 * call, the tag on the file card, the medals on the wall). He never stands on the photo.
 */
function AccountDogDetailPage() {
  const { dogId } = Route.useParams();
  const queries = dogDetailQueries(dogId);
  const { data: dog } = useSuspenseQuery(queries.dog);
  const { data: evaluations } = useSuspenseQuery(queries.evaluations);
  const { data: enrollments } = useSuspenseQuery(queries.enrollments);
  const { data: logbook } = useSuspenseQuery(queries.logbook);
  const { data: myCertificates } = useSuspenseQuery(queries.certificates);
  const { data: publicStatus } = useSuspenseQuery(queries.publicStatus);
  const status = getDogStatus({ dog, evaluations, enrollments });
  const certificates = myCertificates.map(({ link, qr, ...certificate }) => ({ certificate, link, qr }));
  // The approved wording the owner agrees to, present only once the owner has approved one.
  const wording = PUBLIC_RECORD_CONSENT;
  const { fileCard } = dog;
  // The hero's three numbers, from what is already read. A revoked certificate isn't counted: it proves nothing.
  const counts = {
    active: enrollments.filter((enrollment) => enrollment.status === "active").length,
    passed: dog.passedCourses.length,
    certificates: myCertificates.filter((certificate) => certificate.revokedAt === null).length,
  };

  return (
    <div className="overflow-x-clip">
      <PageMotion />

      {/*===== Hero =====*/}
      <DogHero dog={dog} status={status} counts={counts} />

      {/*===== The File =====*/}
      <div
        className={`${COLUMN} grid grid-cols-[minmax(0,1fr)] gap-y-16 pt-section-sm lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-x-12 xl:gap-x-16`}
      >
        {/*------ Courses, Certificates, Diary, Evaluations ------*/}
        <div className="flex flex-col gap-16 lg:self-stretch">
          <EnrollmentsSection enrollments={enrollments} isEvaluated={dog.isEvaluated} />
          <CertificatesSection certificates={certificates} />
          <LogbookSection entries={logbook} />
          <EvaluationsSection evaluations={evaluations} status={status} />
          <BuddyCorner />
        </div>

        {/*------ Profile and File Card ------*/}
        {/* Sticky only where the whole column fits the window: with the dog's file photos it is taller than a laptop screen, and a taller sticky column hides its own bottom until the page ends. */}
        <div className="flex flex-col gap-16 lg:[@media(min-height:1400px)]:sticky lg:[@media(min-height:1400px)]:top-24">
          <DogProfile dog={dog} />
          <FileCard
            dogName={dog.name}
            fileNumber={dog.fileNumber}
            link={fileCard.link}
            qr={fileCard.qr}
            note={
              publicStatus.isPublic ? m.account_dog_detail_file_note_public() : m.account_dog_detail_file_note_private()
            }
          />
          <PublicRecordCard dogId={dog.id} dogName={dog.name} status={publicStatus} wording={wording} />
        </div>
      </div>

      {/*===== Medals =====*/}
      <MedalsBand
        dogName={dog.name}
        courses={dog.passedCourses}
        active={enrollments
          .filter((enrollment) => enrollment.status === "active")
          .map((enrollment) => enrollment.course)}
      />
    </div>
  );
}
