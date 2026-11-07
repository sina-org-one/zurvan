import { PhoneIcon } from "lucide-react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { Link } from "~/components/link";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { buttonVariants } from "~/components/ui/button";
import { CENTER_PHONE } from "~/lib/contact";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Certificate Ask =====*/
/**
 * The closing card, the same for all three answers: a question about the certificate goes straight to Zurvan
 * by phone. A raised grained card, centred, with the phone dog sitting on its top edge at the end corner (the page's
 * left) by the mailbox, a bush either side and a pool of warm light, his line in a bubble over his head. The card has
 * no overflow clipping, so he sits over its edge; its top margin makes room for him and the sky.
 *
 * His sides are physical: he is in the card's left corner and looks right, towards the mailbox, and the bubble's tail
 * is aimed at his head (36px in from its left edge). He and the bubble rise into view on scroll (`lively-reveal`).
 */
export function CertificateAsk() {
  return (
    <section
      aria-labelledby="certificate-ask-title"
      className="relative mx-auto mt-36 max-w-3xl rounded-4xl border border-border bg-card paper-grain px-6 py-10 shadow-sm sm:px-10 lg:mt-44 lg:px-14 lg:py-12"
    >
      {/*===== Dog on the Top Edge =====*/}
      <div
        aria-hidden
        className="lively-reveal pointer-events-none absolute bottom-[calc(100%-0.2rem)] left-6 z-10 w-[4.75rem] sm:left-10 lg:left-14 lg:w-28"
      >
        <div className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_45%_55%_at_50%_55%,rgb(255_194_26/0.08),transparent)]" />
        <MascotCut
          name="plants"
          className="lively-sway-2 absolute right-[92%] bottom-0 w-[64%] translate-y-[4%] -scale-x-100"
        />
        <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[190%] w-[56%] translate-y-[4%]" />
        <MascotCut name="mailbox" className="absolute bottom-0 left-[104%] w-[78%] translate-y-[3%]" />
        <MascotCut name="phone" className="lively-tilt relative block w-full translate-y-[3%]" />
      </div>
      {/* His head's centre is about 56px in from the card's left edge at the wide size, so the bubble starts 36px before it. */}
      <ChalkBubble
        tail="left"
        className="lively-reveal-pop absolute bottom-[calc(100%+7rem)] left-6 z-10 max-w-[calc(100%-1.5rem)] sm:left-10 lg:bottom-[calc(100%+10rem)] lg:left-[calc(3.5rem+56px-36px)]"
      >
        {m.certificate_ask_bubble()}
      </ChalkBubble>

      {/* The chalk sky over the card's empty stretch, beside the dog's bubble. */}
      <NightSky className="right-[8%] bottom-[calc(100%+1.5rem)] h-24 w-[34%] md:right-[10%] md:h-28 md:w-[38%] lg:bottom-[calc(100%+2rem)]" />

      {/*===== Words =====*/}
      <h2 id="certificate-ask-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
        {m.certificate_ask_title()}
      </h2>
      <p className="mt-3 max-w-xl text-pretty text-muted-foreground">{m.certificate_ask_line()}</p>

      {/*===== Actions =====*/}
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={`tel:${CENTER_PHONE.tel}`}
          className={buttonVariants({ variant: "solid", size: "lg", className: "w-full sm:w-auto" })}
        >
          <PhoneIcon aria-hidden data-icon="inline-start" />
          <span>{m.certificate_ask_call()}</span>
          <bdi dir="ltr" className="tracking-wide">
            {CENTER_PHONE.display}
          </bdi>
        </a>
        <Link
          to="/contact"
          className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}
        >
          {m.certificate_ask_contact()}
        </Link>
      </div>
    </section>
  );
}
