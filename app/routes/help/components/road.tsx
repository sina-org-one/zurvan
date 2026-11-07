import { CircleCheckBig, ClipboardList, LockOpen, Phone, ShoppingBasket } from "lucide-react";

import { ChalkBubble } from "~/components/chalk-bubble";
import { MascotCut } from "~/components/mascot-cut";
import { NightSky } from "~/components/night-sky";
import { formatNumber } from "~/lib/locale-format";
import { m } from "~/paraglide/messages";
import { ChalkDefs, SketchedEdge, TrailSegment, WindingTrail } from "~/routes/help/components/chalk-trail";

/*===== Stops =====*/
// The real path from a new dog to the next course (app-spec F3 to F6). It is a sequence, so it is numbered, and each stop
// is the start of the FAQ group with the same number (`faq-data.tsx`).
const STOP_ICONS = [ClipboardList, LockOpen, ShoppingBasket, Phone, CircleCheckBig];

/** The stops in the page's language (a function: the messages follow the locale). */
function getStops() {
  return [
    {
      id: "evaluation",
      title: m.help_road_stop_evaluation_title(),
      line: m.help_road_stop_evaluation_line(),
    },
    { id: "courses", title: m.help_road_stop_courses_title(), line: m.help_road_stop_courses_line() },
    { id: "paying", title: m.help_road_stop_paying_title(), line: m.help_road_stop_paying_line() },
    { id: "training", title: m.help_road_stop_training_title(), line: m.help_road_stop_training_line() },
    { id: "done", title: m.help_road_stop_done_title(), line: m.help_road_stop_done_line() },
  ].map((stop, index) => ({ ...stop, icon: STOP_ICONS[index] }));
}

/*===== Stop Ring =====*/
/**
 * A stop's marker: a hand-drawn ring (its end overlaps its start, as a chalk circle does) on the board's colour, which
 * hides the trail passing under it, with the stop's icon in gold and its number on the ring. It fills gold when its
 * link is hovered or focused, as the numbered disc did before.
 */
function StopRing({ index, icon: Icon }: { index: number; icon: (typeof STOP_ICONS)[number] }) {
  return (
    <span className="relative grid size-16 shrink-0 place-items-center rounded-full bg-sunken transition-colors group-hover/stop:bg-primary group-focus-visible/stop:bg-primary">
      <svg aria-hidden viewBox="0 0 64 64" fill="none" className="absolute inset-0 text-foreground/70">
        <path
          d="M33 4C49 4 60 16 60 32S48 60 32 60 4 47 4 32 16 4 29 5.5"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          filter="url(#hp-trail-chalk)"
        />
      </svg>
      <Icon
        aria-hidden
        className="size-7 text-primary transition-colors group-hover/stop:text-primary-foreground group-focus-visible/stop:text-primary-foreground"
        strokeWidth={1.6}
      />
      <span
        aria-hidden
        className="absolute -start-1.5 -top-1.5 grid size-7 place-items-center rounded-full border border-foreground/40 bg-background text-xs font-bold text-foreground"
      >
        {formatNumber(index + 1)}
      </span>
    </span>
  );
}

/*===== Road =====*/
/**
 * The five stops from the free evaluation to a finished course, on one chalk board with the home page's trail. It
 * answers "how does buying work here?" at a glance and is also the index of the FAQ below.
 *
 * The dog sits on the board's top edge above stop 4 and tells the page's key fact: after the request, the center calls.
 * The signpost stands where the trail starts, the key lies by stop 2 (courses open) and the flag is planted at stop 5
 * (done).
 *
 * Wide: five equal columns, the trail winding through the rings (2 and 4 sit lower). Phones: the stops in a column, the
 * trail down the rings' start side and the words beside them, the dog at the board's end corner.
 *
 * The stops are plain `<a href="#…">`, not the router's `Link`: a native fragment jump is what sets `:target`, which
 * fills the group's disc below.
 *
 * Wide geometry: the board's padding is `--pad`, so stop 4's centre (the 4th from the right, 30% from the left) sits
 * `--pad` + 30% of the content width from the board's left edge; the dog is centred there. The dog and bubble are
 * placed by physical sides because they are tied to the picture and the stop's physical position, not the reading
 * direction.
 */
export function Road() {
  const stops = getStops();

  return (
    <section aria-label={m.help_road_label()} className="site-container pt-48 pb-section-sm md:pt-44 lg:pt-52">
      <ChalkDefs />

      <div className="relative rounded-[2rem] bg-sunken paper-grain px-5 pt-10 pb-10 [--pad:1.25rem] md:px-6 md:pt-12 md:pb-10 md:[--pad:1.5rem] lg:px-10 lg:[--pad:2.5rem]">
        <SketchedEdge />

        {/*------ Props on the edge: the signpost where the trail starts ------*/}
        {/* Its straw tufts overlap the edge, so it stands on it. Its arrow points the way the road goes (to the end). */}
        <MascotCut
          name="signpost"
          className="absolute right-4 bottom-[calc(100%-0.9rem)] w-20 md:right-6 md:w-28 lg:right-[4%] lg:w-32 ltr:md:right-auto ltr:md:left-6 ltr:md:-scale-x-100 ltr:lg:right-auto ltr:lg:left-[4%]"
        />

        {/*------ Night sky over the board, between the dog's bubble and the signpost ------*/}
        <NightSky className="right-[30%] bottom-[calc(100%+1rem)] hidden h-24 w-[26%] md:block lg:right-[18%] lg:h-32 lg:w-[34%]" />
        <NightSky className="right-[14%] bottom-[calc(100%+4.5rem)] h-20 w-[34%] md:hidden" />

        {/*------ The dog over the top edge, on the phone ------*/}
        {/* He sits on the edge (his cut is flat under the haunches, so he sinks a few pixels). A pool of warm light
            behind him, a bush on each side. */}
        <div
          aria-hidden
          className="absolute bottom-[calc(100%-0.4rem)] left-3 z-10 w-24 md:left-[calc(var(--pad)+(100%-2*var(--pad))*0.3)] md:w-32 md:-translate-x-1/2 lg:w-40 ltr:md:left-[calc(var(--pad)+(100%-2*var(--pad))*0.7)]"
        >
          <div className="absolute -inset-x-1/2 -top-1/4 bottom-0 bg-[radial-gradient(ellipse_45%_50%_at_50%_55%,rgb(255_194_26/0.08),transparent)]" />
          <MascotCut name="plants" className="lively-sway absolute bottom-0 left-[88%] w-[46%] translate-y-[3%]" />
          <MascotCut
            name="plants"
            className="lively-sway-2 absolute right-[88%] bottom-0 hidden w-[40%] translate-y-[3%] -scale-x-100 md:block"
          />
          <MascotCut name="phone" className="lively-breathe relative block w-full translate-y-[3%]" />
        </div>
        {/* Wide: the bubble sits to the dog's side (the start) so it doesn't run over the signpost; phones put it
            above both, its tail down at him. */}
        <ChalkBubble
          tail="left"
          className="absolute bottom-[calc(100%+6.5rem)] left-3 z-10 w-[17rem] max-w-[calc(100%-1.5rem)] text-pretty md:bottom-[calc(100%+8.5rem)] md:left-[calc(var(--pad)+(100%-2*var(--pad))*0.3-1.75rem-8px)] md:w-72 lg:bottom-[calc(100%+10.25rem)] ltr:md:left-[calc(var(--pad)+(100%-2*var(--pad))*0.7-1.75rem-8px)]"
        >
          {m.help_road_bubble()}
        </ChalkBubble>

        {/*------ The stops ------*/}
        <ol className="relative grid gap-y-8 md:grid-cols-5">
          <WindingTrail />
          {stops.map((stop, index) => {
            const isLast = index === stops.length - 1;

            return (
              <li key={stop.id} className={`relative md:px-2 ${index % 2 === 1 ? "md:mt-10" : ""}`}>
                {/* Stacked: down from this stop's centre, across the 2rem gap, to the next one's centre. */}
                {!isLast && (
                  <TrailSegment className="absolute start-[calc(2rem-8px)] top-8 -bottom-16 w-4 opacity-55 md:hidden" />
                )}

                {/*------ Props at the stops (wide only: stacked, the words are right beside the ring) ------*/}
                {index === 1 && (
                  <MascotCut
                    name="key"
                    className="absolute top-3 left-[calc(50%-6.25rem)] z-[2] hidden w-16 -rotate-12 md:block ltr:md:right-[calc(50%-6.25rem)] ltr:md:left-auto ltr:md:rotate-12"
                  />
                )}
                {isLast && (
                  <MascotCut
                    name="flag"
                    className="lively-sway-2 absolute -top-4 left-[calc(50%-7.25rem)] hidden w-24 md:block ltr:md:right-[calc(50%-7.25rem)] ltr:md:left-auto"
                  />
                )}

                {/*------ Stop ------*/}
                <a
                  href={`#${stop.id}`}
                  className="group/stop relative z-[1] grid grid-cols-[4rem_1fr] items-start gap-x-5 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:flex md:flex-col md:items-center md:gap-0 md:text-center"
                >
                  <StopRing index={index} icon={stop.icon} />
                  <span className="block md:mt-4">
                    <span className="block font-display text-lg leading-snug font-bold text-foreground md:text-xl">
                      {stop.title}
                    </span>
                    <span className="mt-1 block max-w-64 text-[15px] leading-7 text-pretty text-foreground/75">
                      {stop.line}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
