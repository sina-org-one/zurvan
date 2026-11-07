import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orNotFound } from "~/lib/not-found";
import { pageHead } from "~/lib/seo";
import { requireSession } from "~/lib/session-guard";
import { m } from "~/paraglide/messages";
import {
  DogFormFailed,
  DogFormNotFound,
  DogFormPage,
  dogFormSearchSchema,
  editDogQuery,
} from "~/routes/account_dog_form/account-dog-form";

/*===== Route =====*/
// Customers only: the dogs are a customer's. A partner has none, and the Admin edits dogs in his own area
// (docs/app-spec.md, F2). The API answers NOT_FOUND for another owner's dog too, so a made-up id and someone else's dog
// look the same.
export const Route = createFileRoute("/account/dogs/$dogId/edit")({
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  validateSearch: dogFormSearchSchema,
  loader: async ({ context: { queryClient }, params }) => {
    const dog = await orNotFound(queryClient.ensureQueryData(editDogQuery(params.dogId)));
    return { name: dog.name };
  },
  head: ({ loaderData, params }) =>
    pageHead({
      path: `/account/dogs/${params.dogId}/edit`,
      title: loaderData
        ? m.account_dog_form_meta_title_edit({ name: loaderData.name })
        : m.account_dog_form_meta_title_new(),
      description: m.account_dog_form_header_intro_edit(),
    }),
  component: EditDogPage,
  notFoundComponent: DogFormNotFound,
  errorComponent: DogFormFailed,
});

/*===== Page =====*/
function EditDogPage() {
  const { dogId } = Route.useParams();
  const { redirectTo } = Route.useSearch();
  const { data: dog } = useSuspenseQuery(editDogQuery(dogId));
  return <DogFormPage dog={dog} redirectTo={redirectTo} />;
}
