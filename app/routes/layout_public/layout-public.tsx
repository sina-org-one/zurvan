import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { CartSync } from "~/components/cart-sync";
import { InstallBanner } from "~/components/install-banner";
import { orpc } from "~/orpc/client";
import { SiteFooter } from "~/routes/layout_public/components/site-footer";
import { SiteHeader } from "~/routes/layout_public/components/site-header";
import { TabBar } from "~/routes/layout_public/components/tab-bar";
import { toViewer } from "~/routes/layout_public/viewer";

/*===== Route =====*/
// Pathless: every storefront page sits in this shell. No guard; the session is read only for the header's account
// controls (`toViewer`).
export const Route = createFileRoute("/_public")({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(orpc.session.get.queryOptions()),
  component: PublicLayout,
});

/*===== Public Layout =====*/
/**
 * The storefront shell for every public page: header, the page, the footer, and below `lg` the tab bar. No
 * guard. The page sits on the body's grained paper; the tab bar is fixed, and the footer's own bottom padding keeps
 * the page's last words clear of it.
 *
 * A page sets `staticData: { flushFooter: true }` to drop the gap above the footer, when its last band runs into it
 * (the home page's closing scene, where the dog's leash dangles over the footer's top edge).
 */
function PublicLayout() {
  const { data: session } = useSuspenseQuery(orpc.session.get.queryOptions());
  const viewer = toViewer(session);
  const flushFooter = useMatches({ select: (matches) => matches.some((match) => match.staticData.flushFooter) });

  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      {/* A customer's cart follows them to every device (F5); nobody else has one. */}
      {(viewer?.role === "customer" || viewer?.role === "partner") && <CartSync />}
      <SiteHeader viewer={viewer} />
      <main id="main" className={flushFooter ? "flex-1" : "flex-1 pb-section-md"}>
        <Outlet />
      </main>
      <SiteFooter />
      <TabBar viewer={viewer} />
      <InstallBanner />
    </div>
  );
}
