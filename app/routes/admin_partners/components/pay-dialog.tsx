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
import { formatToman } from "~/lib/course-format";
import { client } from "~/orpc/client";
import type { AdminCommission } from "~/orpc/commission/contract";
import { DIALOG_FOOTER, DIALOG_PLATE, DIALOG_TITLE } from "~/routes/admin_partners/dialog-plate";

/*===== Pay Dialog =====*/
/**
 * The one confirmation before a commission is marked paid (F9). The transfer happened in his bank app; this records it
 * and sends the partner an SMS, which can't be taken back, so he is asked once per commission (no bulk button: each
 * SMS must name a payment that really happened).
 *
 * Controlled, so the page keeps one dialog for every «پرداخت شد» (slips and drawer); the page remounts it (a new `key`)
 * for each opening, which also clears a failure left from the last one. It can't be dismissed while the write is in
 * flight, and `ALREADY_PAID` (another tab got there first) goes through the hook's conflict path: it toasts the API's
 * message, refreshes the list and closes this.
 *
 * `onConfirmed` runs the moment the API has accepted the payment, before the list reloads, so the page can keep the
 * line for its stamp (a conflict or a failure never calls it). After a success the button that opened this is gone, so
 * focus goes to `returnFocus()` instead.
 */
export function PayDialog({
  open,
  onOpenChange,
  commission,
  onConfirmed,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commission: AdminCommission;
  onConfirmed: (commission: AdminCommission) => void;
  /** Where focus lands after a success: the open drawer, or the pay sheet. */
  returnFocus: () => HTMLElement | null;
}) {
  const partnerName = commission.partner.name;
  const succeeded = useRef(false);

  /*------ Write ------*/
  const action = useAdminAction({
    mutationFn: async (id: string) => {
      const result = await client.commission.admin.markPaid({ id });
      succeeded.current = true;
      onConfirmed(commission);
      return result;
    },
    success: `پرداخت شد؛ به ${partnerName} پیامک رفت`,
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
          <AlertDialogTitle className={DIALOG_TITLE}>پرداخت شد؟</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="whitespace-nowrap">{formatToman(commission.amount)}</span> هدیه‌ی معرفی{" "}
            <bdi>{commission.customer.name}</bdi> رو به <bdi>{partnerName}</bdi> دادی؟ به همکار پیامک می‌ره و این کار
            برنمی‌گرده.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FormAlert message={action.isPending ? undefined : (action.failure?.message ?? undefined)} />

        <AlertDialogFooter className={DIALOG_FOOTER}>
          <AlertDialogCancel disabled={action.isPending}>نه، برگرد</AlertDialogCancel>
          <AlertDialogAction variant="solid" disabled={action.isPending} onClick={() => action.run(commission.id)}>
            {action.isPending && <Spinner aria-hidden />}
            {action.isPending ? "داره ثبت می‌شه…" : "بله، پرداخت شد"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
