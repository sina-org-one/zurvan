import { cn } from "cn";
import { CheckIcon, FileTextIcon, ImageIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { useAdminAction } from "~/hooks/use-admin-action";
import { ADMIN_HAIRLINE, ADMIN_PLATE } from "~/lib/admin-plate";
import { toPersianDigits } from "~/lib/digits";
import { formatJalaliTimestamp } from "~/lib/jalali";
import { isPartnerBusinessType, partnerBusinessTypeLabel } from "~/lib/partner-terms";
import { client } from "~/orpc/client";
import type { AdminPartnerApplication } from "~/orpc/partner_application/contract";

/*===== Constants =====*/
const STATUS_CHIP: Record<AdminPartnerApplication["status"], { label: string; className: string }> = {
  pending: { label: "منتظر بررسی", className: "bg-primary text-primary-foreground" },
  approved: { label: "تأیید شد", className: "border border-primary/60 text-primary" },
  rejected: { label: "رد شد", className: "border border-dashed border-foreground/25 text-muted-foreground" },
};

/*===== Applications List =====*/
/**
 * «درخواست‌ها»: who asked to become a partner on `/join/partner` (the owner, 2026-11-06), the waiting ones first. Each
 * card has the person, the business, the marketer if one visited, and when they accepted which version of the terms.
 * A waiting one has «تأیید و ساخت حساب» (creates the partner account with a generated link code and texts them) and
 * «رد» (asks for a reason, which is texted). Answered ones stay, dimmed, with the outcome.
 */
export function ApplicationsList({
  applications,
  onOpenPartner,
}: {
  applications: readonly AdminPartnerApplication[];
  /** Opens the partner an approval created. */
  onOpenPartner: (partnerId: string) => void;
}) {
  return (
    <ul aria-label="درخواست‌های همکاری" className="flex flex-col gap-4">
      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} onOpenPartner={onOpenPartner} />
      ))}
    </ul>
  );
}

/*===== Application Card =====*/
function ApplicationCard({
  application,
  onOpenPartner,
}: {
  application: AdminPartnerApplication;
  onOpenPartner: (partnerId: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const name = `${application.firstName} ${application.lastName}`;
  const pending = application.status === "pending";
  const chip = STATUS_CHIP[application.status];

  const approve = useAdminAction({
    mutationFn: (id: string) => client.partnerApplication.admin.approve({ id }),
    success: `حساب همکار ${application.businessName} ساخته شد`,
  });
  const reject = useAdminAction({
    mutationFn: (vars: { id: string; reason: string }) => client.partnerApplication.admin.reject(vars),
    success: `درخواست ${application.businessName} رد شد`,
    onSuccess: () => setRejecting(false),
  });

  const facts: [string, string][] = [
    [
      "نوع",
      isPartnerBusinessType(application.businessType)
        ? partnerBusinessTypeLabel(application.businessType)
        : application.businessType,
    ],
    ["آدرس", application.address],
    ["بازاریاب", application.marketerName || "—"],
    [
      "قوانین",
      `نسخه‌ی ${toPersianDigits(application.termsVersion)} · قبول کرد ${formatJalaliTimestamp(application.termsAcceptedAt)}`,
    ],
  ];

  return (
    <li className={cn(ADMIN_PLATE, "p-5", !pending && "opacity-75")}>
      {/*------ Who ------*/}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold">
            <bdi>{application.businessName}</bdi>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <bdi>{name}</bdi> ·{" "}
            <a href={`tel:${application.phoneNumber}`} className="font-bold text-foreground hover:underline">
              <bdi dir="ltr" className="tabular-nums">
                {toPersianDigits(application.phoneNumber)}
              </bdi>
            </a>
          </p>
        </div>
        <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-xs font-bold", chip.className)}>
          {chip.label}
        </span>
      </div>

      {/*------ Details ------*/}
      <dl className={cn("mt-4 grid gap-x-6 gap-y-2 border-t pt-4 text-sm sm:grid-cols-2", ADMIN_HAIRLINE)}>
        {facts.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="shrink-0 text-muted-foreground">{label}:</dt>
            <dd className="min-w-0 break-words">
              <bdi>{value}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      {/*------ Papers ------*/}
      {/* Private: each opens through the Admin-only route, in a new tab (a photo, or the browser's PDF viewer). */}
      {application.documents.length > 0 && (
        <ul aria-label="مدارک" className="mt-3 flex flex-wrap gap-2">
          {application.documents.map((document, index) => {
            const Icon = document.format === "pdf" ? FileTextIcon : ImageIcon;
            return (
              <li key={document.id}>
                <a
                  href={`/api/partner-documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 max-w-64 items-center gap-2 rounded-full border border-foreground/20 px-3 text-sm font-bold transition-colors outline-none hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Icon aria-hidden className="size-4 shrink-0 text-primary" />
                  <bdi className="truncate">{document.fileName || `مدرک ${toPersianDigits(String(index + 1))}`}</bdi>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {application.note && (
        <p className="mt-3 rounded-xl bg-background/40 p-3 text-sm text-pretty whitespace-pre-line">
          <bdi>{application.note}</bdi>
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground tabular-nums">
        رسید {formatJalaliTimestamp(application.createdAt)}
        {application.reviewedAt && ` · جواب ${formatJalaliTimestamp(application.reviewedAt)}`}
      </p>

      {/*------ Outcome ------*/}
      {application.status === "rejected" && application.rejectReason && (
        <p className="mt-2 text-sm text-muted-foreground">دلیل رد: {application.rejectReason}</p>
      )}
      {application.status === "approved" && application.partnerId && (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => onOpenPartner(application.partnerId as string)}
        >
          پرونده‌ی همکار
        </Button>
      )}

      {/*------ Answer ------*/}
      {pending && !rejecting && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="solid"
            disabled={approve.isPending}
            onClick={() => approve.run(application.id)}
          >
            {approve.isPending ? <Spinner aria-hidden /> : <CheckIcon aria-hidden />}
            تأیید و ساخت حساب
          </Button>
          <Button type="button" variant="outline" onClick={() => setRejecting(true)}>
            <XIcon aria-hidden />
            رد
          </Button>
          {approve.failure?.fields.phoneNumber && (
            <p className="w-full text-sm text-destructive">{approve.failure.fields.phoneNumber}</p>
          )}
        </div>
      )}
      {pending && rejecting && (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            reject.run({ id: application.id, reason });
          }}
        >
          <label htmlFor={`reject-${application.id}`} className="text-sm font-bold">
            دلیل رد (برای متقاضی پیامک می‌شه)
          </label>
          <Textarea
            id={`reject-${application.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-20"
            aria-invalid={!!reject.failure?.fields.reason}
          />
          {reject.failure?.fields.reason && <p className="text-sm text-destructive">{reject.failure.fields.reason}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="solid" disabled={reject.isPending}>
              {reject.isPending && <Spinner aria-hidden />}
              رد درخواست
            </Button>
            <Button type="button" variant="outline" onClick={() => setRejecting(false)}>
              بی‌خیال
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
