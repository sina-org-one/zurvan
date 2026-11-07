import { cn } from "cn";
import { XIcon } from "lucide-react";
import { useState } from "react";

import { CustomerContact } from "~/components/customer-contact";
import { Button } from "~/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "~/components/ui/sheet";
import { Spinner } from "~/components/ui/spinner";
import { useAdminAction } from "~/hooks/use-admin-action";
import { useIsMobile } from "~/hooks/use-mobile";
import { ADMIN_HAIRLINE, ADMIN_TEAR } from "~/lib/admin-plate";
import { formatToman } from "~/lib/course-format";
import { formatNumberFa } from "~/lib/digits";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatJalaliTimestamp } from "~/lib/jalali";
import { isPartnerBusinessType, partnerBusinessTypeLabel } from "~/lib/partner-terms";
import { client } from "~/orpc/client";
import type { AdminCommission } from "~/orpc/commission/contract";
import type { AdminPartner, PartnerPerson, PartnerPersonStage } from "~/orpc/partner/contract";
import { CopyButton } from "~/routes/admin_partners/components/copy-button";
import { PersonRow } from "~/routes/admin_partners/components/person-row";
import { ShebaInset } from "~/routes/admin_partners/components/sheba-inset";
import { StageChip } from "~/routes/admin_partners/components/stage-chip";
import { SHEET_PLATE } from "~/routes/admin_partners/dialog-plate";
import { useChanged } from "~/routes/admin_partners/hooks/use-changed";

/*===== Constants =====*/
/** A section of the drawer's body: the slip's tear above every one but the first. */
const SECTION = cn("grid gap-3 border-t py-5 first:border-t-0 first:pt-0", ADMIN_TEAR);

/** The people's groups, furthest along the road first: who bought is what he pays for. */
const STAGE_ORDER: readonly PartnerPersonStage[] = ["bought", "registered", "lead", "lost"];

/*===== Partner Drawer =====*/
/**
 * One partner's file: how to reach and pay him, his link, the people he brought, his commissions, and last the switch
 * that opens or closes his account. A side sheet on desktop, a bottom sheet on phones. The page finds the partner in
 * the whole list, so after a write the drawer stays open on the fresh data, and what changed (his active chip, a
 * commission's «پرداخت شد») is pressed in. It is not `ui/drawer`, which positions physically and is wrong in RTL.
 */
export function PartnerDrawer({
  partnerId,
  partner,
  commissions,
  siteOrigin,
  bodyRef,
  onClose,
  onPay,
  onDeactivate,
}: {
  /** From `?partner=`; null means closed. */
  partnerId: string | null;
  /** The match for the id in the full list; null when the id is unknown. */
  partner: AdminPartner | null;
  /** Only this partner's commissions, oldest first. */
  commissions: readonly AdminCommission[];
  /** The site's address, to show the referral link as it will be printed. */
  siteOrigin: string;
  /** The scrolling body, where focus lands after a payment made from here. */
  bodyRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onPay: (commission: AdminCommission) => void;
  onDeactivate: () => void;
}) {
  const isMobile = useIsMobile();

  // While the sheet fades out the id is already gone from the URL: keep drawing the last one instead of flashing the
  // "not found" body. Set during render (not in an effect) so there is no frame with stale content.
  const [last, setLast] = useState<{
    id: string;
    partner: AdminPartner | null;
    commissions: readonly AdminCommission[];
  } | null>(null);
  if (partnerId !== null && (last?.id !== partnerId || last.partner !== partner || last.commissions !== commissions)) {
    setLast({ id: partnerId, partner, commissions });
  }
  const current = partnerId === null ? last : { partner, commissions };

  return (
    <Sheet open={partnerId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={isMobile ? "bottom" : "left"} showCloseButton={false} className={SHEET_PLATE}>
        {current &&
          (current.partner ? (
            // Keyed by the partner, so opening another one never "changes" a status and stamps it.
            <DrawerBody
              key={current.partner.id}
              partner={current.partner}
              commissions={current.commissions}
              siteOrigin={siteOrigin}
              bodyRef={bodyRef}
              onPay={onPay}
              onDeactivate={onDeactivate}
            />
          ) : (
            <MissingBody />
          ))}
      </SheetContent>
    </Sheet>
  );
}

/*===== Close Button =====*/
function CloseButton() {
  return (
    <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="بستن" className="-me-1 shrink-0" />}>
      <XIcon aria-hidden />
    </SheetClose>
  );
}

/*===== Unknown Id =====*/
// A link to a partner that isn't in the list (an old bookmark).
function MissingBody() {
  return (
    <div className="flex items-start justify-between gap-3 p-5">
      <div>
        <SheetTitle className={cn(DISPLAY_HEADING, "text-xl")}>این همکار پیدا نشد</SheetTitle>
        <SheetDescription className="mt-1.5">از فهرست همکاران یکی رو باز کن.</SheetDescription>
      </div>
      <CloseButton />
    </div>
  );
}

/*===== Body =====*/
function DrawerBody({
  partner,
  commissions,
  siteOrigin,
  bodyRef,
  onPay,
  onDeactivate,
}: {
  partner: AdminPartner;
  commissions: readonly AdminCommission[];
  siteOrigin: string;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  onPay: (commission: AdminCommission) => void;
  onDeactivate: () => void;
}) {
  const link = `${siteOrigin}/?ref=${partner.code}`;
  const switched = useChanged(partner.isActive);

  /*------ Activate ------*/
  // No dialog: it only makes the link and numbers count for later sign-ups again.
  const activate = useAdminAction({
    mutationFn: (id: string) => client.partner.admin.setActive({ id, isActive: true }),
    success: `${partner.name} دوباره فعال شد`,
  });

  const unpaid = commissions.filter((commission) => commission.paidAt === null);
  const paid = commissions.filter((commission) => commission.paidAt !== null);

  /*------ People by Stage ------*/
  const groups = STAGE_ORDER.map((stage) => ({
    stage,
    people: partner.people.filter((person) => person.stage === stage),
  })).filter((group) => group.people.length > 0);

  return (
    <>
      {/*===== Head (fixed) =====*/}
      <header className={cn("grid gap-3 border-b-2 p-5", ADMIN_TEAR)}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <SheetTitle className={cn(DISPLAY_HEADING, "text-xl break-words")}>
              <bdi>{partner.name}</bdi>
              {partner.role === "customer" && (
                <span className="ms-2 align-middle text-sm font-bold text-muted-foreground">(مشتری معرف)</span>
              )}
            </SheetTitle>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span
                key={String(partner.isActive)}
                className={cn(
                  "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-bold",
                  partner.isActive
                    ? "border-foreground/25 text-foreground/85"
                    : "border-dashed border-foreground/30 text-muted-foreground",
                  switched && "pp-chip-stamp",
                )}
              >
                {partner.isActive ? "فعال" : "غیرفعال"}
              </span>
              <span dir="ltr" className="text-xs text-muted-foreground">
                <span className="sr-only">کد لینک: </span>
                {partner.code}
              </span>
              <SheetDescription className="text-xs">
                همکار از {formatJalaliTimestamp(partner.createdAt)}
              </SheetDescription>
              {partner.businessName && (
                <span className="text-xs text-muted-foreground">
                  <bdi>{partner.businessName}</bdi>
                  {partner.businessType && isPartnerBusinessType(partner.businessType)
                    ? ` · ${partnerBusinessTypeLabel(partner.businessType)}`
                    : ""}
                </span>
              )}
              {/* Until he accepts the terms in force, his dashboard shows only them and no customer can be entered. */}
              <span
                className={cn("text-xs", partner.termsAcceptedAt ? "text-muted-foreground" : "font-bold text-primary")}
              >
                {partner.termsAcceptedAt
                  ? `قوانین رو قبول کرده · ${formatJalaliTimestamp(partner.termsAcceptedAt)}`
                  : "هنوز قوانین همکاری رو قبول نکرده"}
              </span>
            </div>
          </div>
          <CloseButton />
        </div>
        <CustomerContact
          name={partner.name}
          phoneNumber={partner.phoneNumber}
          variant="call"
          className="[&>span:first-child]:hidden"
          callClassName="max-md:w-full max-md:justify-center"
        />
      </header>

      {/*===== Scrolling Body =====*/}
      {/* Focusable so focus has somewhere to land after a payment made from here (its button is gone). */}
      <div
        ref={bodyRef}
        tabIndex={-1}
        data-lenis-prevent
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none"
      >
        {/*------ Link ------*/}
        <section aria-labelledby="partner-link" className={SECTION}>
          <h3 id="partner-link" className="text-sm font-bold">
            لینک معرفی
          </h3>
          <p className="rounded-xl bg-background/70 px-3.5 py-2.5 text-sm break-all shadow-[inset_0_1px_3px_rgb(0_0_0/0.6)] ring-1 ring-foreground/10">
            <bdi dir="ltr">{link}</bdi>
          </p>
          <CopyButton text={link} label="کپی لینک" className="h-11 w-full md:h-10" />
        </section>

        {/*------ Sheba ------*/}
        <section aria-labelledby="partner-sheba" className={SECTION}>
          <h3 id="partner-sheba" className="text-sm font-bold">
            شبا
          </h3>
          {partner.shebaNumber ? (
            <ShebaInset sheba={partner.shebaNumber} name={partner.name} />
          ) : (
            <p className="rounded-xl border border-dashed border-foreground/25 px-3.5 py-3 text-sm text-muted-foreground">
              هنوز شبا ننوشته؛ زنگ بزن بپرسه.
            </p>
          )}
        </section>

        {/*------ People ------*/}
        <section aria-labelledby="partner-people" className={SECTION}>
          <h3 id="partner-people" className="text-sm font-bold">
            آدم‌هاش <span className="font-normal text-muted-foreground">{formatNumberFa(partner.people.length)}</span>
          </h3>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز شماره‌ای ننوشته و کسی با لینکش نیومده.</p>
          ) : (
            groups.map((group) => <PeopleGroup key={group.stage} stage={group.stage} people={group.people} />)
          )}
        </section>

        {/*------ Commissions ------*/}
        <section aria-labelledby="partner-commissions" className={SECTION}>
          <h3 id="partner-commissions" className="text-sm font-bold">
            هدیه‌های معرفی
          </h3>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز هدیه‌ای نوشته نشده.</p>
          ) : (
            <ul className={cn("divide-y", ADMIN_HAIRLINE)}>
              {[...unpaid, ...paid].map((commission) => (
                <DrawerCommission key={commission.id} commission={commission} onPay={() => onPay(commission)} />
              ))}
            </ul>
          )}
        </section>

        {/*------ Danger Zone ------*/}
        <section aria-labelledby="partner-switch" className={cn(SECTION, "pb-0")}>
          <div className="grid gap-3 rounded-2xl border border-dashed border-destructive/40 bg-destructive/[0.04] p-4">
            <h3 id="partner-switch" className="text-sm font-bold">
              {partner.isActive ? "غیرفعال کردن" : "این همکار غیرفعاله"}
            </h3>
            <p className="text-sm leading-6 text-pretty text-muted-foreground">
              {partner.isActive
                ? "لینک و شماره‌هاش دیگه کسی رو به اسمش ثبت نمی‌کنن و برای خریدهای بعدی هدیه‌ای نوشته نمی‌شه. هدیه‌هایی که نوشته شدن می‌مونن."
                : "لینک و شماره‌هاش الان کسی رو به اسمش ثبت نمی‌کنن. فعالش کنی، از این به بعد دوباره حساب می‌شن."}
            </p>
            {partner.isActive ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 sm:w-fit md:h-10 dark:bg-transparent"
                onClick={onDeactivate}
              >
                غیرفعال کردن
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full border-foreground/20 bg-transparent sm:w-fit md:h-10 dark:bg-transparent"
                disabled={activate.isPending}
                onClick={() => activate.run(partner.id)}
              >
                {activate.isPending && <Spinner aria-hidden />}
                فعال کردن
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

/*===== People Group =====*/
/** The people at one stage of his road: the stage chip (ink) and how many, then each person. */
function PeopleGroup({ stage, people }: { stage: PartnerPersonStage; people: readonly PartnerPerson[] }) {
  return (
    <div>
      <p className="flex items-center gap-2 pb-1">
        <StageChip stage={stage} />
        <span className="text-xs text-muted-foreground tabular-nums">{formatNumberFa(people.length)}</span>
      </p>
      <ul className={cn("divide-y ps-1", ADMIN_HAIRLINE)}>
        {people.map((person) => (
          <PersonRow key={`${person.source}-${person.id}`} person={person} />
        ))}
      </ul>
    </div>
  );
}

/*===== Drawer Commission =====*/
/**
 * One commission in his file: the customer, how it comes about or the day it was paid, the amount, and «پرداخت شد» (gold)
 * while it waits. Paid from here, the line stays where it is: its button turns into the quiet paid chip, pressed in.
 */
function DrawerCommission({ commission, onPay }: { commission: AdminCommission; onPay: () => void }) {
  const isPaid = commission.paidAt !== null;
  const arrived = useChanged(isPaid);

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">
          <bdi>{commission.customer.name}</bdi>
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {commission.paidAt
            ? `پرداخت شد ${formatJalaliTimestamp(commission.paidAt)}`
            : `${formatNumberFa(commission.percent)}٪ از ${formatToman(commission.baseAmount)}، خرید ${formatJalaliTimestamp(commission.createdAt)}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm font-bold whitespace-nowrap tabular-nums">{formatToman(commission.amount)}</p>
        {isPaid ? (
          <span
            key="paid"
            className={cn(
              "inline-flex h-7 items-center rounded-full border border-success/40 px-2.5 text-xs font-bold text-success",
              arrived && "pp-chip-stamp",
            )}
          >
            پرداخت شد
          </span>
        ) : (
          <Button type="button" variant="solid" size="sm" className="h-10" onClick={onPay}>
            پرداخت شد
          </Button>
        )}
      </div>
    </li>
  );
}
