import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireSession } from "~/lib/session-guard";
import { orpc } from "~/orpc/client";
import { ADMIN_NAV_ITEMS, type AdminNavItem, type AdminNavPath } from "~/routes/layout_admin/admin-nav";
import { AdminBottomTabs } from "~/routes/layout_admin/components/admin-bottom-tabs";
import { AdminHeader } from "~/routes/layout_admin/components/admin-header";
import { AdminRail } from "~/routes/layout_admin/components/admin-rail";
import { ShellMotion } from "~/routes/layout_admin/components/shell-motion";

/*===== Route =====*/
export const Route = createFileRoute("/admin")({
  // The Admin is the head trainer, the only staff account (docs/app-spec.md, Roles). Customers and partners are sent
  // to their own home; visitors to sign in. The oRPC `admin` procedures check the role again.
  beforeLoad: ({ context, location }) =>
    requireSession({ queryClient: context.queryClient, location, roles: ["admin"] }),
  // The counts on the rail: the three kinds of work that wait for him (F11, "Waiting for him"), read from the
  // Overview's one call.
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(orpc.dashboard.admin.overview.queryOptions()),
  // A private area: keep it out of search results.
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

/*===== Admin Layout =====*/
/** The Admin's shell at `/admin`: a top bar, a rail on desktop, a tab bar on phones, and the page in between. */
function AdminLayout() {
  const { user: guardUser } = Route.useRouteContext();
  // The session query the guard filled, read live, so renaming himself on Users shows in the header at once (every
  // Admin action invalidates it); the guard's answer stands in if it ever reads as signed out mid-refetch.
  const { data: session } = useSuspenseQuery(orpc.session.get.queryOptions());
  const user = session.status === "active" ? session.user : guardUser;
  // Read through the query, so every Admin action (`useAdminAction` invalidates every API query) refetches it and a
  // count drops (and its badge pops) as soon as he answers.
  const {
    data: { waiting, money },
  } = useSuspenseQuery(orpc.dashboard.admin.overview.queryOptions());
  // The counts come from the server, so they are put on the items here and not in the static list. Each says on a
  // screen reader what it counts.
  const badges: Partial<Record<AdminNavPath, Pick<AdminNavItem, "badge" | "badgeLabel">>> = {
    "/admin/evaluations": { badge: waiting.evaluationRequests, badgeLabel: "درخواست منتظر جواب" },
    "/admin/payments": { badge: waiting.paidNotEnrolled.count, badgeLabel: "خرید ثبت‌نام‌نشده" },
    "/admin/partners": { badge: money.unpaidCommissions.count, badgeLabel: "هدیه‌ی معرفی پرداخت‌نشده" },
  };
  const navItems = ADMIN_NAV_ITEMS.map((item) => ({ ...item, ...badges[item.to] }));

  return (
    <div className="flex min-h-svh flex-col">
      <ShellMotion />
      <AdminHeader firstName={user.firstName} phoneNumber={user.phoneNumber} />
      <div className="flex flex-1">
        <AdminRail items={navItems} />
        <main id="main" className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
      <AdminBottomTabs items={navItems} />
    </div>
  );
}
