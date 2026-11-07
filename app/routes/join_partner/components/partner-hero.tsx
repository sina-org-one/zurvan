import { LogInIcon, PhoneIcon, SendIcon } from "lucide-react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { GroundStrip } from "~/components/ground-strip";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { buttonVariants } from "~/components/ui/button";
import { CENTER_PHONE } from "~/lib/contact";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";
import { COLUMN } from "~/routes/join_partner/column";

/*===== Partner Hero =====*/
/**
 * The partner page's first screen: the headline, the line with the referral gift's percents, «درخواست همکاری» (to the form below), «ورود همکار» and the
 * call on the start side, and on the end side a little street of the places a partner owns. The clinic and the pet shop stand side by
 * side on one path and the freshly groomed dog sits in front of them, the third kind of place (the groomer's), telling
 * the shop owner to send his like to the trainer.
 *
 * Wide: words at the start, the street at the end. Phones: the street on top, the words under.
 *
 * The street's pieces are placed by physical sides because they are tied to the pictures (he looks to the right, at the
 * words, and his bubble's tail is aimed at his head), not to the reading direction. The percents come from the settings
 * (the Admin's commission steps); nothing here depends on their width.
 *
 * @param percentRange The lowest to the highest commission step, written out («۱۰ تا ۱۸٪»).
 */
export function PartnerHero({ percentRange }: { percentRange: string }) {
  return (
    <section
      aria-labelledby="partner-title"
      className={`${COLUMN} grid items-center gap-y-6 pt-section-sm pb-section-sm lg:grid-cols-12 lg:gap-x-12`}
    >
      {/*===== Words =====*/}
      <div className="order-2 lg:order-1 lg:col-span-6">
        {/* Two unbreakable halves: on phones the line breaks after the question, not inside it. */}
        <h1 id="partner-title" className={`${DISPLAY_HEADING} text-h1 text-balance lg:text-[3.2rem]`}>
          <span className="inline-block">{m.join_partner_hero_title_a()}</span>{" "}
          <span className="inline-block text-primary">{m.join_partner_hero_title_b()}</span>
        </h1>
        <p className="mt-4 max-w-md text-lead text-pretty text-muted-foreground">
          {m.join_partner_hero_line({ percent: percentRange })}
        </p>
        {/* Applying is the main way in now (the Admin reviews it); a partner who already has an account signs in. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="#apply"
            className={buttonVariants({ variant: "solid", size: "lg", className: "w-full sm:w-auto sm:px-10" })}
          >
            <SendIcon aria-hidden className="size-4" />
            {m.join_partner_hero_apply()}
          </a>
          <Link
            to="/auth"
            search={{ as: "partner" }}
            className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto sm:px-8" })}
          >
            <LogInIcon aria-hidden className="size-4" />
            {m.join_partner_hero_sign_in()}
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {m.join_partner_hero_or_call()}{" "}
          <a href={`tel:${CENTER_PHONE.tel}`} className="font-bold text-foreground underline-offset-4 hover:underline">
            <PhoneIcon aria-hidden className="me-1 inline size-3.5" />
            <bdi dir="ltr">{CENTER_PHONE.display}</bdi>
          </a>
        </p>
      </div>

      {/*===== Street =====*/}
      <div className="relative order-1 h-[17rem] lg:order-2 lg:col-span-6 lg:h-[23rem]">
        {/*------ Sky and Light ------*/}
        <NightSky className="inset-x-0 top-0 h-[42%]" />
        {/* A pool of warm light where he sits. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_48%_55%_at_50%_75%,rgb(255_194_26/0.08),transparent)]"
        />

        {/*------ The Two Buildings and the Path ------*/}
        <div aria-hidden>
          {/* They rise out of the dark one after the other on load (the first screen's pictures, so eager). */}
          <div className="jp-rise absolute bottom-[0.9rem] left-0 w-[48%] translate-y-[6%] [--rise-delay:0.1s] lg:bottom-[1.3rem]">
            <MascotCut name="petshop" eager className="block w-full" />
          </div>
          <div className="jp-rise absolute right-0 bottom-[0.9rem] w-[50%] translate-y-[6%] [--rise-delay:0.28s] lg:bottom-[1.3rem]">
            <MascotCut name="clinic" eager className="block w-full" />
          </div>
          <GroundStrip className="absolute inset-x-0 bottom-0 h-7 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] lg:h-10" />
        </div>

        {/*------ The Groomed Dog in Front ------*/}
        {/* He sits at the buildings' seam, bushes on both sides. His bubble stands inside his box so it follows him:
            the tail is 36px in from the bubble's right edge, and his head is about 60% across his picture. */}
        <div className="absolute bottom-[0.65rem] left-1/2 z-10 w-24 -translate-x-1/2 lg:bottom-[1rem] lg:w-36">
          <MascotCut
            name="plants"
            eager
            className="lively-sway absolute bottom-0 left-[92%] w-[46%] translate-y-[3%] lg:left-[88%]"
          />
          <MascotCut
            name="plants"
            eager
            className="lively-sway-2 absolute right-[92%] bottom-0 w-[40%] translate-y-[3%] -scale-x-100 lg:right-[88%]"
          />
          <MascotCut
            name="groomed"
            eager
            className="jp-dog lively-breathe lively-pet relative block w-full translate-y-[3%]"
          />
          <ChalkBubble
            tail="right"
            className="jp-pop absolute right-[calc(40%-36px)] bottom-[calc(100%+0.4rem)] w-max max-w-[13.5rem] text-pretty lg:max-w-[16rem]"
          >
            {m.join_partner_hero_bubble()}
          </ChalkBubble>
        </div>
      </div>

      {/* The page's one load moment: the street fades up out of the dark (the two buildings rise a few pixels, one
          after the other), then the groomed dog's bubble pops from its tail (bottom right, 2.25rem in) and settles into
          the shared float. The buildings' own translate stays (Tailwind's separate `translate` property). Off for
          reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .jp-rise {
            animation: jp-rise .8s cubic-bezier(.2,.8,.2,1) var(--rise-delay, 0s) both;
          }
          .jp-dog {
            animation: jp-rise .6s cubic-bezier(.2,.8,.2,1) .5s both, lively-breathe 2.6s ease-in-out 1.1s infinite;
          }
          .jp-pop {
            transform-origin: calc(100% - 2.25rem) 100%;
            animation: answer-pop .38s cubic-bezier(.3,1.45,.5,1) 1.05s both, lively-float 3.4s ease-in-out 1.45s infinite alternate;
          }
        }
        @keyframes jp-rise {
          from { opacity: 0; transform: translateY(1rem); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </section>
  );
}
