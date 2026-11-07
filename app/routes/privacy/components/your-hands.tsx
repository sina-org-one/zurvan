import { GroundStrip } from "~/components/ground-strip";
import { MascotCut } from "~/components/mascot-cut";
import { CENTER_PHONE } from "~/lib/contact";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Your Hands Section =====*/
/**
 * What the visitor can change alone, and what only the trainer can, on a grained card. The words are at the start; the
 * stage at the end is the dog carrying the key in his mouth, on a path with a bush (the key is yours). On phones the
 * stage closes the card under the words, with the path along the card's bottom edge, so he is never floating.
 *
 * The `tel:` link is a plain anchor: the router's `Link` is for in-app paths. The number is shown in Latin-direction,
 * since it is read as digits. The key dog's picture looks to the right, towards the words (physical sides).
 */
export function YourHands() {
  return (
    <section
      id="yours"
      aria-labelledby="yours-title"
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-card paper-grain shadow-sm lg:grid lg:grid-cols-12"
    >
      {/*===== Words =====*/}
      <div className="p-6 sm:p-8 lg:col-span-7 lg:p-10">
        <h2 id="yours-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
          {m.privacy_section_yours()}
        </h2>
        <div className="mt-6 max-w-prose space-y-4 text-pretty text-muted-foreground">
          <p>{m.privacy_yours_p1()}</p>
          <p>
            {m.privacy_yours_p2_before()}
            <a
              href={`tel:${CENTER_PHONE.tel}`}
              className="rounded-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {m.privacy_yours_p2_link()}
            </a>
            .{" "}
            <bdi dir="ltr" className="font-bold text-foreground">
              {CENTER_PHONE.display}
            </bdi>
          </p>
        </div>
      </div>

      {/*===== Stage =====*/}
      <div aria-hidden className="pointer-events-none relative h-56 lg:col-span-5 lg:h-auto lg:min-h-[17rem]">
        {/* A pool of warm light where he stands. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_85%,rgb(255_194_26/0.08),transparent)]" />
        <GroundStrip className="absolute inset-x-0 bottom-0 h-8 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] lg:h-10" />
        <MascotCut
          name="plants"
          className="lively-sway absolute bottom-[1rem] left-[6%] w-[19%] translate-y-[6%] lg:bottom-[1.2rem]"
        />
        <div className="pv-hop absolute bottom-[1rem] left-1/2 h-44 -translate-x-1/2 lg:bottom-[1.2rem] lg:h-52">
          <MascotCut name="key-carry" className="lively-breathe block h-full w-auto" />
        </div>
        <MascotCut
          name="plants"
          className="lively-sway-2 absolute right-[6%] bottom-[1rem] w-[16%] translate-y-[6%] -scale-x-100 lg:bottom-[1.2rem]"
        />
      </div>
    </section>
  );
}
