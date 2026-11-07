import { cn } from "cn";
import { HandshakeIcon } from "lucide-react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { GroundStrip } from "~/components/ground-strip";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/account_partner/column";
import type { PartnerFunnel } from "~/routes/account_partner/funnel";

/*===== Partner Hero =====*/
/**
 * The top of the partner's desk, «همکاری من»: the center's dog comes out to the shop owner's street to greet a colleague.
 * The words at the start: the «همکار» chip, the h1 with his first name in gold, the one line that says how a customer
 * becomes his, and a tally plate of the funnel's three numbers. The street at the end (on phones a band on top): the
 * dimmed pet shop and clinic side by side, the `wave` dog in front of their seam, a bush either side, a path, a night
 * sky and a pool of warm light.
 *
 * The street's pieces use physical sides: they are tied to the pictures (the dog faces right, towards the words) and to
 * the bubble's tail (a physical side, 2.25rem in from the bubble's edge), which is aimed at his head.
 *
 * The page's load moment (page-motion.tsx): he waves (`pd-wave`, then his idle tilt), the bubble pops at 0.4s, the
 * tally's numbers rise one after another.
 */
export function PartnerHero({
  firstName,
  funnel,
  isPartner,
}: {
  firstName: string;
  funnel: PartnerFunnel;
  /** A customer refers friends from the same page (F7, the owner 2026-11-07); a few lines speak to them instead. */
  isPartner: boolean;
}) {
  return (
    <section aria-labelledby="partner-title" className="pt-4 pb-8 lg:pt-section-sm lg:pb-10">
      <div className={cn(COLUMN, "relative z-10 grid gap-y-6 lg:grid-cols-12 lg:gap-x-12")}>
        {/*===== Words =====*/}
        <div className="order-2 lg:order-1 lg:col-span-7 lg:flex lg:flex-col lg:justify-center lg:py-6">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/45 px-3.5 py-1 text-sm font-bold text-primary">
            <HandshakeIcon aria-hidden strokeWidth={2} className="size-4" />
            {isPartner ? m.account_partner_hero_chip() : m.account_partner_hero_chip_customer()}
          </p>
          <h1 id="partner-title" className={cn(DISPLAY_HEADING, "mt-4 text-h1 text-balance")}>
            {m.account_partner_hero_title_lead()} <span className="text-primary">{firstName}</span>!
          </h1>
          <p className="mt-3 max-w-xl text-lead text-pretty text-muted-foreground">
            {isPartner ? m.account_partner_hero_lead() : m.account_partner_hero_lead_customer()}
          </p>
          <TallyPlate funnel={funnel} />
        </div>

        {/*===== Street =====*/}
        <Street isPartner={isPartner} />
      </div>
    </section>
  );
}

/*===== Tally Plate =====*/
/**
 * The funnel's three numbers in gold on a grained plate, a `dl` with each number over its label. A zero is a calm «—»
 * (with its word for screen readers), so a partner who has just started doesn't read a row of failures. Hairlines are
 * each cell's start border, the first one's pulled out of the clip.
 */
function TallyPlate({ funnel }: { funnel: PartnerFunnel }) {
  const cells = [
    { label: m.account_partner_tally_numbers(), value: funnel.numbers },
    { label: m.account_partner_tally_registered(), value: funnel.registered },
    { label: m.account_partner_tally_bought(), value: funnel.bought },
  ];

  return (
    <div className="mt-7 w-full overflow-hidden rounded-3xl border border-border bg-card paper-grain shadow-sm sm:w-fit">
      <dl className="-ms-px grid grid-cols-3">
        {cells.map(({ label, value }, index) => (
          <div
            key={label}
            className="flex flex-col-reverse items-center gap-1 border-s border-border px-3 py-4 sm:px-8"
          >
            <dt className="text-center text-xs leading-snug font-bold text-balance text-muted-foreground sm:text-sm">
              {label}
            </dt>
            <dd
              className={cn(
                `pd-tally pd-tally-${index + 1} font-display text-4xl leading-none font-black`,
                value === 0 ? "text-muted-foreground/60" : "text-primary",
              )}
            >
              {value === 0 ? (
                <>
                  <span aria-hidden>—</span>
                  <span className="sr-only">{m.account_partner_zero_sr()}</span>
                </>
              ) : (
                formatNumber(value)
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/*===== Street =====*/
/**
 * The picture: a fixed box of pieces standing on the path at the stage's bottom, so a taller words column only adds
 * sky. `--dog-w` is the dog's width and `--ground` how high the path lifts the pieces; the bubble is placed from them,
 * so it sits over his head whatever the screen. Phones: a 12.5rem band; from `lg`, as tall as the words.
 */
function Street({ isPartner }: { isPartner: boolean }) {
  return (
    <div
      aria-hidden
      className="relative order-1 h-[12.5rem] [--dog-w:6rem] [--ground:0.9rem] lg:order-2 lg:col-span-5 lg:h-auto lg:min-h-[24rem] lg:[--dog-w:9rem] lg:[--ground:1.2rem]"
    >
      {/* A pool of warm light where he sits. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_50%_80%,rgb(255_194_26/0.08),transparent)]" />

      {/*------ Sky ------*/}
      <NightSky className="inset-x-[6%] top-1 h-14 lg:top-4 lg:h-24" />

      {/*------ Path ------*/}
      <GroundStrip className="absolute inset-x-0 bottom-0 h-7 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] lg:h-9" />

      {/*------ Pieces ------*/}
      {/* The pet shop on the left, the clinic on the right, the dog in front of their seam. */}
      <div className="absolute inset-x-0 bottom-(--ground) mx-auto h-full w-[20rem] lg:w-[28rem]">
        <MascotCut
          name="plants"
          eager
          className="lively-sway absolute bottom-0 -left-[1rem] z-10 w-[3rem] translate-y-[6%] lg:-left-[1.5rem] lg:w-[4.5rem]"
        />
        <MascotCut name="petshop" eager className="absolute bottom-0 left-[0.5rem] w-[48%] translate-y-[6%]" />
        <MascotCut name="clinic" eager className="absolute right-[0.5rem] bottom-0 w-[46%] translate-y-[6%]" />
        <MascotCut
          name="plants"
          eager
          className="lively-sway-2 absolute -right-[1rem] bottom-0 z-10 w-[2.75rem] translate-y-[6%] -scale-x-100 lg:-right-[1.5rem] lg:w-[4rem]"
        />

        {/*------ The Dog ------*/}
        {/* The wave on the wrapper, the idle tilt on the picture, so one doesn't cancel the other. Two bushes at his
            feet hide where he meets the path. */}
        <div className="absolute bottom-0 left-1/2 z-10 w-(--dog-w) -translate-x-1/2 translate-y-[3%]">
          <MascotCut name="plants" eager className="lively-sway absolute bottom-0 left-[80%] w-[44%]" />
          <MascotCut name="plants" eager className="lively-sway-2 absolute right-[84%] bottom-0 w-[36%] -scale-x-100" />
          <div className="pd-wave relative">
            <div className="lively-pet">
              <MascotCut name="wave" eager className="lively-tilt block w-full" />
            </div>
          </div>
        </div>

        {/*------ Bubble ------*/}
        {/* His head is about half his width across and near the top of his 307/223 height: the tail's centre (2.25rem
            in from the bubble's left edge) lands over it, and the bubble reaches out over the clinic's roof. */}
        <ChalkBubble
          tail="left"
          className="pd-hello absolute bottom-[calc(var(--dog-w)*1.38+0.5rem)] left-[calc(50%-2.25rem)] z-20 max-w-[12rem] whitespace-nowrap lg:max-w-none"
        >
          {isPartner ? m.account_partner_hero_bubble() : m.account_partner_hero_bubble_customer()}
        </ChalkBubble>
      </div>
    </div>
  );
}
