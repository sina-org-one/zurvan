import { PhoneIcon } from "lucide-react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { buttonVariants } from "~/components/ui/button";
import { CENTER_PHONE, CENTER_PHONE_SECOND } from "~/lib/contact";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/contact/column";

/*===== Contact Hero =====*/
/**
 * The page's top: the headline and its line on the start side, and the phone plate on the end side with the number as
 * the hero. The dog sits on the plate's top edge between two bushes, on the phone, saying the number is right here.
 *
 * The dog is on the plate's start corner, facing the words (the cut-out looks that way), and his bubble opens to his
 * left: physical sides, because the bubble's tail is aimed at the picture. The section keeps a gap under the grid for
 * the next band's letter dog and mailbox, which stand on that band's coping and reach up into it.
 */
export function ContactHero() {
  return (
    <section aria-labelledby="contact-title" className="relative pt-section-sm pb-56 md:pb-60 lg:pb-44">
      {/*------ Sky ------*/}
      <NightSky className="top-4 right-[3%] hidden h-72 w-[46%] lg:block" />

      <div className={`${COLUMN} relative grid items-center gap-y-10 lg:grid-cols-12 lg:gap-x-12`}>
        {/*===== Words =====*/}
        {/* Bottom-aligned with the plate (the plate column also holds the dog's headroom), so neither column ends empty. */}
        <div className="lg:col-span-6 lg:self-end">
          <h1 id="contact-title" className={`${DISPLAY_HEADING} text-h1 text-balance lg:text-[3.4rem]`}>
            {m.contact_hero_title()}
          </h1>
          <p className="mt-4 max-w-md text-lead text-pretty text-muted-foreground">{m.contact_hero_lead()}</p>
        </div>

        {/*===== Phone Plate =====*/}
        {/* The top padding is the dog's height (he stands above the plate and takes no room of his own). */}
        <div className="relative pt-44 lg:col-span-6 lg:pt-56">
          <div className="relative">
            {/*------ The Dog on the Plate ------*/}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full">
              <div className="relative ms-[4%] w-36 translate-y-[2%] sm:ms-[8%] lg:ms-[6%] lg:w-48 max-lg:ltr:ms-auto max-lg:ltr:me-[4%]">
                {/* The pool of light he stands in. */}
                <div className="absolute -inset-x-[70%] bottom-0 h-[130%] bg-[radial-gradient(ellipse_45%_60%_at_50%_85%,rgb(255_194_26/0.08),transparent)]" />
                <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[84%] w-[58%]" />
                <MascotCut name="plants" className="lively-sway-2 absolute right-[88%] bottom-0 w-[48%] -scale-x-100" />
                <MascotCut name="phone" eager className="lively-wiggle lively-pet relative block w-full" />
                <ChalkBubble
                  tail="right"
                  className="ct-pop absolute right-[78%] bottom-[58%] w-max max-w-[10.5rem] text-pretty lg:right-[84%] lg:max-w-[14rem]"
                >
                  {m.contact_hero_bubble()}
                </ChalkBubble>
              </div>
            </div>

            {/*------ The Plate ------*/}
            <div className="relative rounded-3xl border border-border bg-card paper-grain px-6 py-7 shadow-[0_24px_50px_-24px_rgb(0_0_0/0.9)] md:px-9 md:py-9">
              <p className="text-sm font-bold text-muted-foreground">{m.contact_hero_phone_label()}</p>
              {/* The number is the hero: LTR inside the RTL page, ivory, as large as a phone's width allows. */}
              <p className="mt-2 font-display text-[2.5rem] leading-tight font-black tracking-wide text-foreground tabular-nums sm:text-5xl lg:text-[3.5rem]">
                <bdi dir="ltr">{CENTER_PHONE.display}</bdi>
              </p>
              <a
                href={`tel:${CENTER_PHONE.tel}`}
                className={buttonVariants({
                  variant: "solid",
                  size: "lg",
                  className: "mt-6 w-full sm:w-auto sm:px-10",
                })}
              >
                <PhoneIcon aria-hidden strokeWidth={2} />
                {m.contact_hero_call()}
              </a>

              {/*------ Second Number ------*/}
              {/* Quieter than the first: the hero stays the one number, this is for when it's busy. */}
              <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border pt-5">
                <span className="text-sm font-bold text-muted-foreground">{m.contact_hero_phone_second_label()}</span>
                <a
                  href={`tel:${CENTER_PHONE_SECOND.tel}`}
                  className="rounded font-display text-2xl font-black tracking-wide text-foreground tabular-nums outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/60"
                >
                  <bdi dir="ltr">{CENTER_PHONE_SECOND.display}</bdi>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The page's one load moment: the phone dog's bubble pops from its tail (bottom right, 2.25rem in) once the page
          is up. Off for reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ct-pop {
            transform-origin: calc(100% - 2.25rem) 100%;
            animation: answer-pop .38s cubic-bezier(.3,1.45,.5,1) .5s both;
          }
        }
      `}</style>
    </section>
  );
}
