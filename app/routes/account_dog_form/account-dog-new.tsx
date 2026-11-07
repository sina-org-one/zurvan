import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "~/lib/seo";
import { requireSession } from "~/lib/session-guard";
import { m } from "~/paraglide/messages";
import {
  DogFormFailed,
  DogFormNotFound,
  DogFormPage,
  dogFormSearchSchema,
} from "~/routes/account_dog_form/account-dog-form";

/*===== Route =====*/
// Customers only: the dogs are a customer's. A partner has none, and the Admin edits dogs in his own area
// (docs/app-spec.md, F2).
export const Route = createFileRoute("/account/dogs/new")({
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  validateSearch: dogFormSearchSchema,
  head: () =>
    pageHead({
      path: "/account/dogs/new",
      title: m.account_dog_form_meta_title_new(),
      description: m.account_dog_form_header_intro_new(),
    }),
  component: NewDogPage,
  notFoundComponent: DogFormNotFound,
  errorComponent: DogFormFailed,
});

/*===== Page =====*/
function NewDogPage() {
  const { redirectTo, step } = Route.useSearch();
  return <DogFormPage dog={null} redirectTo={redirectTo} step={step} />;
}
