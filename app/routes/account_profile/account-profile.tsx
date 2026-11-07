import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orNotFound } from "~/lib/not-found";
import { pageHead } from "~/lib/seo";
import { orpc } from "~/orpc/client";
import { m } from "~/paraglide/messages";
import { ProfileError } from "~/routes/account_profile/components/profile-error";
import { ProfileSettings } from "~/routes/account_profile/components/profile-settings";

/*===== Route =====*/
// No guard of its own: `layout_account` already lets in customers and partners, and the Sheba API checks the role again
// on the server.
export const Route = createFileRoute("/account/profile")({
  loader: async ({ context: { queryClient } }) => {
    // Partners and customers both earn referral gifts (F7, the owner 2026-11-07), so both have a Sheba. A customer's
    // referral row is made on the first read; a partner with no row is a broken account, which the error look says.
    await Promise.all([
      orNotFound(queryClient.ensureQueryData(orpc.partner.getMine.queryOptions())),
      queryClient.ensureQueryData(orpc.password.status.queryOptions()),
    ]);
  },
  head: () =>
    pageHead({
      path: "/account/profile",
      title: m.account_profile_meta_title(),
      description: m.account_profile_meta_description(),
    }),
  component: AccountProfilePage,
  // Inside the account shell, so the header and its way back stay on screen. A missing partner row gets the same look.
  notFoundComponent: ProfileError,
  errorComponent: ProfileError,
});

/*===== Profile Settings =====*/
/**
 * F1's profile page for customers and partners: the name, the password, and the Sheba Zurvann pays referral gifts to
 * (partners and customers alike). The idea is the person's own tag on the house's hall stand, engraved as they type, with the
 * center's dog looking after each card; the page itself is `ProfileSettings`.
 */
function AccountProfilePage() {
  const { user } = Route.useRouteContext();
  const { data: password } = useSuspenseQuery(orpc.password.status.queryOptions());
  const { data: profile } = useSuspenseQuery(orpc.partner.getMine.queryOptions());

  return (
    <ProfileSettings
      firstName={user.firstName}
      lastName={user.lastName}
      phoneNumber={user.phoneNumber}
      // The Sheba card: everyone here can earn a referral gift now, customers too.
      isPartner
      shebaNumber={profile.shebaNumber}
      hasPassword={password.hasPassword}
    />
  );
}
