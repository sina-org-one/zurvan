import { useRef } from "react";

import { FormAlert } from "~/components/form-alert";
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
import { Spinner } from "~/components/ui/spinner";
import { useAdminAction } from "~/hooks/use-admin-action";
import { client } from "~/orpc/client";
import type { AdminPartner } from "~/orpc/partner/contract";
import { DIALOG_FOOTER, DIALOG_PLATE, DIALOG_TITLE } from "~/routes/admin_partners/dialog-plate";

/*===== Deactivate Dialog =====*/
/**
 * «غیرفعال بشه؟»: the one confirmation before a partner's link and numbers stop counting (F7). Written commissions stay
 * and are paid as usual, which the body says outright so he doesn't hold back from closing an account for fear of
 * losing what is owed. Activating again needs no dialog (it only starts counting later sign-ups), so it lives in the
 * drawer's danger zone as one button.
 *
 * Controlled and remounted by the page for each opening, like the pay dialog. The drawer stays open behind it, so
 * focus goes back there and the chip that changed is pressed in.
 */
export function DeactivateDialog({
  open,
  onOpenChange,
  partner,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: AdminPartner;
  /** Where focus lands after a success: the drawer's body (the button that opened this is replaced). */
  returnFocus: () => HTMLElement | null;
}) {
  const succeeded = useRef(false);

  const action = useAdminAction({
    mutationFn: async (id: string) => {
      const result = await client.partner.admin.setActive({ id, isActive: false });
      succeeded.current = true;
      return result;
    },
    success: `${partner.name} غیرفعال شد`,
    toastFailure: false,
    onSuccess: () => onOpenChange(false),
    onConflict: () => onOpenChange(false),
  });

  return (
    <AlertDialog open={open} onOpenChange={(next) => !action.isPending && onOpenChange(next)}>
      <AlertDialogContent
        className={DIALOG_PLATE}
        finalFocus={() => {
          if (!succeeded.current) return true;
          returnFocus()?.focus({ preventScroll: true });
          return false;
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={DIALOG_TITLE}>
            <bdi>{partner.name}</bdi> غیرفعال بشه؟
          </AlertDialogTitle>
          <AlertDialogDescription>
            از این به بعد لینک و شماره‌هاش کسی رو به اسمش ثبت نمی‌کنه و برای خریدهای بعدی هدیه‌ای نوشته نمی‌شه.
            هدیه‌هایی که نوشته شدن می‌مونن و پرداختشون می‌کنی. هر وقت بخوای دوباره فعالش می‌کنی.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FormAlert message={action.isPending ? undefined : (action.failure?.message ?? undefined)} />

        <AlertDialogFooter className={DIALOG_FOOTER}>
          <AlertDialogCancel disabled={action.isPending}>نه، بمونه</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={action.isPending} onClick={() => action.run(partner.id)}>
            {action.isPending && <Spinner aria-hidden />}
            غیرفعال کن
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
