import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { CartSync } from "~/components/cart-sync";
import { InstallBanner } from "~/components/install-banner";
import { requireSession } from "~/lib/session-guard";
import { ACCOUNT_EXIT_LINK, roomLabel as getRoomLabel } from "~/routes/layout_account/account-nav";
import { AccountFooter } from "~/routes/layout_account/components/account-footer";
import { AccountHeader } from "~/routes/layout_account/components/account-header";
import { AccountTabBar } from "~/routes/layout_account/components/account-tab-bar";
import { useAccountNavItems } from "~/routes/layout_account/hooks/use-account-nav-items";

/*===== Route =====*/
// Signed in as a customer or a partner. The Admin has his own area (docs/app-spec.md, Pages). The guard's `user` lands in
// the route context, so the shell and every page below read the person from there.
export const Route = createFileRoute("/account")({
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["customer", "partner"] }),
  component: AccountLayout,
});

/*===== Account Layout =====*/
/**
 * The signed-in shell for customers and partners at `/account`: the storefront's house with the account's own room.
 * The header and the tab bar (below `lg`) are the storefront's look with the desk's sections; the footer is a
 * short grained band with the dog on the phone. The wrapper clips sideways so cut-outs and bubbles may poke past the
 * container.
 *
 * A page sets `staticData: { flushFooter: true }` to drop the gap above the footer, when its last band runs into it
 * (the Dashboard's and Dog Detail's closing brick bands); `hideBottomTabs` is for focused steps (`AccountTabBar`).
 */
function AccountLayout() {
  const { user } = Route.useRouteContext();
  const role = user.role === "partner" ? "partner" : "customer";
  const navItems = useAccountNavItems(role);
  const flushFooter = useMatches({ select: (matches) => matches.some((match) => match.staticData.flushFooter) });
  const roomLabel = getRoomLabel(role);

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      {/* Both: a partner can be a customer too. */}
      <CartSync />
      <AccountHeader
        firstName={user.firstName}
        phoneNumber={user.phoneNumber}
        roomLabel={roomLabel}
        navItems={navItems}
        exitLink={ACCOUNT_EXIT_LINK}
      />
      <main id="main" className={flushFooter ? "flex-1" : "flex-1 pb-section-md"}>
        <Outlet />
      </main>
      <AccountFooter />
      <AccountTabBar items={navItems} exitLink={ACCOUNT_EXIT_LINK} label={roomLabel} />
      <InstallBanner />
    </div>
  );
}
