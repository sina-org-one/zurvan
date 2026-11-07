import { useState } from "react";

import { FormAlert } from "~/components/form-alert";
import { Link } from "~/components/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { useAdminAction } from "~/hooks/use-admin-action";
import type { UserStatus } from "~/lib/user-constants";
import { client } from "~/orpc/client";
import type { AdminUser } from "~/orpc/user/contract";
import { CONFIRM_FOOTER, CONFIRM_PLATE, DIALOG_TITLE } from "~/routes/admin_users/dialog-plate";
import { spokenName } from "~/routes/admin_users/people";

/*===== Constants =====*/
/** Blocking a partner closes his sign-in only (F1, F7); his link and commission are switched off on Partners. */
const PARTNER_NOTE = "فقط ورودش بسته می‌شه؛ لینک و هدیه‌ش روشن می‌مونه. برای خاموش کردنشون توی";

const OUTLINE_DESTRUCTIVE =
  "h-11 w-full border-destructive/45 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-10 sm:w-fit dark:bg-transparent";

/*===== Danger Zone =====*/
/**
 * The switch that shuts an account or opens it again, last in the dialog on a dashed destructive plate. Blocking asks
 * once (it signs the person out everywhere); opening again needs no question. The Admin's own row and any admin have
 * no button, only the plain reason (the API refuses both too).
 *
 * `onConfirmed` runs the moment the API has accepted the switch, before the list reloads, so the page can keep the row
 * for its exit when the change takes it out of the status pill. Success then closes the whole dialog; a failure stays
 * in a `FormAlert` (in the confirm while it is open, else on the plate) so the Admin sees why and can try again.
 */
export function DangerZone({
  user,
  onConfirmed,
  onDone,
}: {
  user: AdminUser;
  onConfirmed: (saved: AdminUser) => void;
  onDone: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const spoken = spokenName(user);

  const change = useAdminAction({
    mutationFn: async (status: UserStatus) => {
      const saved = await client.user.admin.setStatus({ id: user.id, status });
      onConfirmed(saved);
      return saved;
    },
    success: (saved) =>
      saved.status === "blocked" ? `${spokenName(saved)} مسدود شد` : `حساب ${spokenName(saved)} باز شد`,
    toastFailure: false,
    onSuccess: () => {
      setConfirmOpen(false);
      onDone();
    },
    // The person is gone (NOT_FOUND): the hook has toasted why and reloaded.
    onConflict: () => {
      setConfirmOpen(false);
      onDone();
    },
  });

  const blocked = user.status === "blocked";
  const failureMessage = change.isPending ? undefined : (change.failure?.message ?? undefined);

  return (
    <section
      aria-labelledby="admin-user-danger-title"
      className="grid gap-3 rounded-2xl border border-dashed border-destructive/45 bg-destructive/[0.04] p-4"
    >
      {user.isSelf || user.role === "admin" ? (
        /*===== Can't Be Blocked =====*/
        <>
          <h3 id="admin-user-danger-title" className="text-sm font-bold">
            مسدود کردن
          </h3>
          <p className="text-sm leading-6 text-pretty text-muted-foreground">
            {user.isSelf
              ? "حساب خودت مسدود نمی‌شه؛ اگه می‌شد، دیگه کسی نمی‌تونست بازش کنه."
              : "حساب مدیر مسدود نمی‌شه."}
          </p>
        </>
      ) : blocked ? (
        /*===== Open Again =====*/
        <>
          <h3 id="admin-user-danger-title" className="text-sm font-bold text-destructive">
            این حساب مسدوده
          </h3>
          <p className="text-sm leading-6 text-pretty text-muted-foreground">
            نمی‌تونه وارد بشه و کد ورود نمی‌گیره. اطلاعاتش سر جاشه؛ با باز کردن حساب دوباره می‌تونه بیاد.
          </p>
          <FormAlert message={failureMessage} />
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-foreground/20 bg-transparent sm:h-10 sm:w-fit dark:bg-transparent"
            disabled={change.isPending}
            onClick={() => {
              change.reset();
              change.run("active");
            }}
          >
            {change.isPending && <Spinner aria-hidden />}
            باز کردن حساب
          </Button>
        </>
      ) : (
        /*===== Block =====*/
        <>
          <h3 id="admin-user-danger-title" className="text-sm font-bold">
            مسدود کردن
          </h3>
          <p className="text-sm leading-6 text-pretty text-muted-foreground">
            همون لحظه از همه‌جا بیرون می‌ره و دیگه کد ورود نمی‌گیره. سگ‌ها و خریدهاش می‌مونن و هر وقت بخوای بازش می‌کنی.
          </p>
          {user.role === "partner" && <PartnerNote user={user} />}
          {!confirmOpen && <FormAlert message={failureMessage} />}
          <Button
            type="button"
            variant="outline"
            className={OUTLINE_DESTRUCTIVE}
            onClick={() => {
              change.reset();
              setConfirmOpen(true);
            }}
          >
            مسدود کردن
          </Button>
        </>
      )}

      {/*===== Confirm =====*/}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!change.isPending) setConfirmOpen(next);
        }}
      >
        <AlertDialogContent className={CONFIRM_PLATE}>
          <AlertDialogHeader>
            <AlertDialogTitle className={DIALOG_TITLE}>
              <bdi>{spoken}</bdi> مسدود بشه؟
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-6 text-pretty">
              همین الان از همه‌جا بیرون می‌ره و دیگه کد ورود نمی‌گیره. سگ‌ها و خریدهاش می‌مونن و هر وقت بخوای دوباره
              بازش می‌کنی.
              {user.role === "partner" &&
                " لینک و هدیه‌ش روشن می‌مونه؛ برای خاموش کردنشون توی صفحه‌ی همکارا غیرفعالش کن."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <FormAlert message={failureMessage} />

          <AlertDialogFooter className={CONFIRM_FOOTER}>
            <AlertDialogCancel disabled={change.isPending}>نه</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={change.isPending} onClick={() => change.run("blocked")}>
              {change.isPending && <Spinner aria-hidden />}
              آره، مسدودش کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/*===== Partner Note =====*/
function PartnerNote({ user }: { user: AdminUser }) {
  return (
    <p className="text-sm leading-6 text-pretty text-muted-foreground">
      {PARTNER_NOTE}{" "}
      <Link
        to="/admin/partners"
        search={{ view: "partners", partner: user.id }}
        className="rounded-sm text-foreground underline underline-offset-4 outline-none hover:text-foreground/80 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        صفحه‌ی همکارا
      </Link>{" "}
      غیرفعالش کن.
    </p>
  );
}
