import { cn } from "cn";
import { PhoneIcon } from "lucide-react";

import { Link } from "~/components/link";
import { MascotCut, type MascotCutName } from "~/components/mascot-cut";
import { buttonVariants } from "~/components/ui/button";
import { PROFILE_PATH } from "~/lib/account-links";
import { CENTER_PHONE } from "~/lib/contact";
import { m } from "~/paraglide/messages";

/*===== Notice Plate =====*/
// Text at the start, the button under it (beside it from `sm`), and room at the end for the dog sitting on the plate's
// floor. From `sm` the end padding is wider than the scene, so the words never run under it; on phones the words take
// the full width and the button's row is as tall as the dog, with the button stopping short of him (`ACTION`).
const ACTION = "flex min-h-[6.25rem] shrink-0 items-end sm:min-h-0 sm:items-center max-sm:ltr:justify-end";
const ACTION_BUTTON = "w-[calc(100%-9.75rem)] sm:w-auto sm:px-6";

const NOTICE =
  "answer-in relative flex min-h-[9rem] flex-col justify-center gap-4 overflow-hidden rounded-4xl border-2 bg-sunken paper-grain p-5 shadow-[0_18px_36px_-22px_rgb(0_0_0/0.95)] sm:min-h-[8.5rem] sm:flex-row sm:items-center sm:justify-start sm:gap-10 sm:p-7 sm:pe-[17rem] ltr:sm:ps-[17rem] ltr:sm:pe-7";

/*===== Partner Notices =====*/
/**
 * At most two plates under the hero, and only when they are true. Without a Sheba the center can't pay the
 * commission, so that is said first (the same meaning as Profile Settings' commission plate, with the `piggy` dog and
 * the dimmed safe); an inactive partner's link attributes no one, so the only useful step is to call the center (the
 * `padlock` dog by the padlocked gate). They rise in with the page.
 */
export function PartnerNotices({ isActive, hasSheba }: { isActive: boolean; hasSheba: boolean }) {
  if (hasSheba && isActive) return null;

  return (
    <div className="flex flex-col gap-4 pb-10 lg:pb-12">
      {/*===== No Sheba =====*/}
      {!hasSheba && (
        <section
          aria-labelledby="partner-sheba-notice"
          className={cn(NOTICE, "border-primary/60 [--answer-delay:.55s]")}
        >
          <div>
            <h2 id="partner-sheba-notice" className="text-lg font-bold text-balance">
              {m.account_partner_notice_sheba_title()}
            </h2>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">{m.account_partner_notice_sheba_body()}</p>
          </div>
          <div className={ACTION}>
            <Link
              to={PROFILE_PATH}
              className={buttonVariants({
                variant: "outline",
                className: cn(ACTION_BUTTON, "border-primary text-primary hover:text-primary"),
              })}
            >
              {m.account_partner_notice_sheba_button()}
            </Link>
          </div>
          <NoticeScene
            dog="piggy"
            dogClassName="w-[6.25rem] sm:w-[8.5rem]"
            boxClassName="left-[4rem] sm:left-[6rem]"
            scenery={{ name: "safe", width: "62%" }}
          />
        </section>
      )}

      {/*===== Inactive =====*/}
      {!isActive && (
        <section
          aria-labelledby="partner-inactive-notice"
          className={cn(NOTICE, "border-destructive/55 [--answer-delay:.65s]")}
        >
          <h2 id="partner-inactive-notice" className="max-w-2xl text-lg font-bold text-pretty">
            {m.account_partner_notice_inactive()}
          </h2>
          <div className={ACTION}>
            <a
              href={`tel:${CENTER_PHONE.tel}`}
              className={buttonVariants({ variant: "outline", className: ACTION_BUTTON })}
            >
              <PhoneIcon aria-hidden className="size-4" />
              <bdi dir="ltr">{CENTER_PHONE.display}</bdi>
            </a>
          </div>
          <NoticeScene
            dog="padlock"
            dogClassName="w-[5.25rem] sm:w-[6.5rem]"
            boxClassName="left-[4.25rem] sm:left-[6.5rem]"
            scenery={{ name: "gate", width: "105%" }}
          />
        </section>
      )}
    </div>
  );
}

/*===== Notice Scene =====*/
/**
 * The dog sitting (or lying) on the notice plate's floor at its end, the plate's own bottom edge: a pool of warm light,
 * the dimmed piece of scenery behind him with a small bush, a bush in front of him, his idle breath. The box is sunk 3%
 * and the plate clips it, so his soft feet disappear into the edge. Physical sides: he faces right, towards the words.
 */
function NoticeScene({
  dog,
  dogClassName,
  boxClassName,
  scenery,
}: {
  dog: MascotCutName;
  dogClassName: string;
  /** Where his box stands from the plate's left edge, clear of the rounded corner with the scenery behind him. */
  boxClassName: string;
  scenery: { name: MascotCutName; width: string };
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute bottom-0 translate-y-[3%]", boxClassName, dogClassName)}
    >
      <div className="absolute -inset-x-1/2 -top-1/3 bottom-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_70%,rgb(255_194_26/0.09),transparent)]" />
      <div className="absolute right-[70%] bottom-0" style={{ width: scenery.width }}>
        <MascotCut name={scenery.name} className="block w-full" />
        <MascotCut
          name="plants"
          className="lively-sway-2 absolute right-[80%] bottom-0 w-[36%] translate-y-[4%] -scale-x-100"
        />
      </div>
      <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[78%] w-[38%]" />
      <MascotCut name={dog} className="lively-breathe relative block w-full" />
    </div>
  );
}
