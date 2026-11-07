import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { LockIcon } from "lucide-react";

import { AdminPageHeader } from "~/components/admin-page-header";
import { Link } from "~/components/link";
import { buttonVariants } from "~/components/ui/button";
import { ADMIN_TEAR } from "~/lib/admin-plate";
import { orpc } from "~/orpc/client";
import { DEPOSIT_PERCENT_KEY, OTP_PER_IP_KEY, OTP_PER_PHONE_KEY } from "~/orpc/setting/constants";
import { CommissionTiersPlate } from "~/routes/admin_settings/components/commission-tiers-plate";
import { SettingGroup } from "~/routes/admin_settings/components/setting-group";
import { SettingPlate } from "~/routes/admin_settings/components/setting-plate";
import { SettingsMotion } from "~/routes/admin_settings/components/settings-motion";

/*===== Constants =====*/
/** The ink outline (Batch 2 and 3's) for the error page's way back. */
const INK_OUTLINE =
  "border-foreground/15 bg-transparent hover:bg-foreground/5 dark:border-foreground/15 dark:bg-transparent";

/*===== Route =====*/
// The guard is the layout's. The three numbers come in the API's fixed order, each with its default, bounds and the
// time of its last change; the commission steps are a table of their own. No URL state.
export const Route = createFileRoute("/admin/settings")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(orpc.setting.admin.get.queryOptions()),
      queryClient.ensureQueryData(orpc.setting.admin.commissionTiers.queryOptions()),
    ]),
  head: () => ({ meta: [{ title: "تنظیمات | مدیریت زروان" }] }),
  component: AdminSettings,
  notFoundComponent: () => <SettingsError notFound />,
  errorComponent: () => <SettingsError notFound={false} />,
});

/*===== Admin Settings =====*/
/**
 * F10 for the Admin: the partners' commission steps, the deposit taken when a customer pays, and how many sign-in
 * codes one phone or one connection may ask for in an hour. A saved number is read by the next request, so nothing here
 * needs a restart. Each setting is its own plate with its own «ذخیره».
 */
function AdminSettings() {
  const { data: settings, isFetching: settingsFetching } = useSuspenseQuery(orpc.setting.admin.get.queryOptions());
  const { data: commissionTiers, isFetching: tiersFetching } = useSuspenseQuery(
    orpc.setting.admin.commissionTiers.queryOptions(),
  );
  const find = (key: string) => settings.find((setting) => setting.key === key);
  const deposit = find(DEPOSIT_PERCENT_KEY);
  const perPhone = find(OTP_PER_PHONE_KEY);
  const perIp = find(OTP_PER_IP_KEY);

  /*------ Busy ------*/
  // Leaving for another page, or the settings refetching after a save.
  const navigating = useRouterState({ select: (state) => state.status === "pending" });
  const busy = navigating || settingsFetching || tiersFetching;

  return (
    <div>
      <SettingsMotion />

      {/*===== Header =====*/}
      <AdminPageHeader title="تنظیمات" summary="این‌ها بدون راه‌اندازی دوباره اجرا می‌شن." />

      <div className="flex flex-col gap-8 lg:gap-10">
        {/*===== Commission =====*/}
        <SettingGroup title="هدیه‌ی معرفی همکاران">
          <CommissionTiersPlate setting={commissionTiers} busy={busy} />
        </SettingGroup>

        {/*===== Deposit =====*/}
        {deposit && (
          <SettingGroup title="پیش‌پرداخت">
            <SettingPlate setting={deposit} busy={busy} />
          </SettingGroup>
        )}

        {/*===== Sign-in Codes =====*/}
        {perPhone && perIp && (
          <SettingGroup title="کد ورود پیامکی">
            <SettingPlate setting={perPhone} busy={busy} />
            <SettingPlate setting={perIp} busy={busy} />

            {/*------ Fixed Rules ------*/}
            {/* What he might look for here and won't find: a dashed plate, the same vocabulary as an empty state. */}
            <div className={`flex items-start gap-3 rounded-3xl border px-5 py-4 lg:px-6 ${ADMIN_TEAR}`}>
              <LockIcon aria-hidden strokeWidth={1.7} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-pretty text-muted-foreground">
                طول کد (۵ رقم)، اعتبار ۲ دقیقه، ۵ بار اشتباه و ۶۰ ثانیه انتظار بین دو کد ثابتن و از اینجا عوض نمی‌شن.
              </p>
            </div>
          </SettingGroup>
        )}
      </div>
    </div>
  );
}

/*===== Error Boundary =====*/
// Renders inside the Admin layout, so the rail and tabs stay.
function SettingsError({ notFound }: { notFound: boolean }) {
  return (
    <div>
      <AdminPageHeader
        title={notFound ? "این صفحه پیدا نشد" : "تنظیمات باز نشد"}
        summary="یه مشکلی پیش اومد. صفحه رو دوباره باز کن یا چند دقیقه‌ی دیگه سر بزن."
      />
      <Link to="/admin" className={buttonVariants({ variant: "outline", className: INK_OUTLINE })}>
        برگرد به نمای کلی
      </Link>
    </div>
  );
}
