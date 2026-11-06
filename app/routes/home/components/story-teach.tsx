import { cn } from "cn";
import { useLenis } from "lenis/react";
import Snap from "lenis/snap";
import { motion, useMotionTemplate, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { formatNumber } from "~/lib/locale-format";
import { services, type ServiceId } from "~/routes/home/content";
import { ChalkBubble } from "~/components/chalk-bubble";
import { MascotCut, type MascotCutName } from "~/components/mascot-cut";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Content =====*/
// What each service opens into. A draft from docs/zurvan-courses.md (the course cards and the owner's notes) for the
// owner to check: no prices, session counts or promises the cards don't make.

// `rise` is the pose's height against the standing ones, so every pose is drawn at one scale and the lying dog
// doesn't swell to a standing dog's height.
// `bubbleAt` places the wide-screen bubble by the head when the default (up and to the right) doesn't fit the pose.
const SCENES: Record<ServiceId, { pose: MascotCutName; rise: number; bubbleAt?: string }> = {
  basic: { pose: "teach-basic", rise: 0.98 },
  // Lying flat, his head is low and far right: the bubble goes above it, not past the plate's edge.
  behavior: { pose: "teach-calm", rise: 0.54, bubbleAt: "bottom-[96%] left-[34%]" },
  specialist: { pose: "teach-work", rise: 1 },
  competition: { pose: "teach-medal", rise: 0.98 },
  advice: { pose: "teach-advice", rise: 0.99 },
};

/**
 * The services with their points and the dog's line, worded in the page's language when the section renders. The
 * competition line is the longest: on one line it runs past the plate's edge, so it breaks after the question.
 */
function teachItems() {
  const words: Record<ServiceId, { points: string[]; says: string }> = {
    basic: {
      points: [m.home_service_basic_point_one(), m.home_service_basic_point_two(), m.home_service_basic_point_three()],
      says: m.home_service_basic_says(),
    },
    behavior: {
      points: [m.home_service_behavior_point_one(), m.home_service_behavior_point_two()],
      says: m.home_service_behavior_says(),
    },
    specialist: {
      points: [
        m.home_service_specialist_point_one(),
        m.home_service_specialist_point_two(),
        m.home_service_specialist_point_three(),
      ],
      says: m.home_service_specialist_says(),
    },
    competition: {
      points: [m.home_service_competition_point_one(), m.home_service_competition_point_two()],
      says: m.home_service_competition_says(),
    },
    advice: {
      points: [
        m.home_service_advice_point_one(),
        m.home_service_advice_point_two(),
        m.home_service_advice_point_three(),
      ],
      says: m.home_service_advice_says(),
    },
  };
  return services().map((service) => ({ ...service, ...SCENES[service.id], ...words[service.id] }));
}

/** The number of services, for the pinned stretch's height and steps (it doesn't change with the language). */
const ITEM_COUNT = 5;

// The garland across the top of the plate: pennants hung along a sagging string (Q 200 46), each turned to the string.
// Every third is gold, the rest a tint of the ink.
const PENNANTS = [
  "M25.4 10.8L41.2 13.4L30.0 31.8Z",
  "M58.7 16.1L74.6 18.2L64.0 36.9Z",
  "M92.0 20.2L108.0 21.8L98.0 40.9Z",
  "M125.4 23.2L141.3 24.3L132.0 43.7Z",
  "M158.7 25.2L174.7 25.7L166.0 45.4Z",
  "M192.0 26.0L208.0 26.0L200.0 46.0Z",
  "M225.3 25.7L241.3 25.2L234.0 45.4Z",
  "M258.7 24.3L274.6 23.2L268.0 43.7Z",
  "M292.0 21.8L308.0 20.2L302.0 40.9Z",
  "M325.4 18.2L341.3 16.1L336.0 36.9Z",
  "M358.8 13.4L374.6 10.8L370.0 31.8Z",
] as const;

// Each item after the first owns this much scroll while the section is pinned. Less than a screen, so five items
// don't feel like a chore; the section is one screen plus four steps tall.
const STEP_SVH = 85;

/*===== Fluid Type =====*/
// The panel is exactly one screen, so its type follows the screen's width and height, whichever runs out first:
// a wide but short laptop (1366×768 leaves about 650px) gets smaller headings instead of an open service running off
// the bottom. Each size is clamped between its phone and big-screen sizes, and the middle term keeps a rem part so
// browser zoom still enlarges it (a font sized only in vw/svh ignores zoom).
const FLUID = {
  title: "clamp(1.875rem, calc(0.75rem + min(3.2vw, 5.5svh)), 3.75rem)",
  intro: "clamp(1rem, calc(0.75rem + min(0.5vw, 0.9svh)), 1.125rem)",
  service: "clamp(1.5rem, calc(0.5rem + min(2.6vw, 4.4svh)), 3rem)",
  detail: "clamp(1rem, calc(0.75rem + min(0.6vw, 1.1svh)), 1.25rem)",
  points: "clamp(0.875rem, calc(0.625rem + min(0.6vw, 1.1svh)), 1.125rem)",
  gap: "clamp(0.375rem, min(0.8vw, 1.2svh), 0.75rem)",
} as const;

/*===== Reduced Motion =====*/
// Read through an external store so the server and the hydrating render agree (the pinned version), then the
// browser's real setting takes over.
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduce(listener: () => void) {
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
}

/*===== Snap =====*/
/**
 * After the visitor stops scrolling inside the pinned stretch, Lenis eases the page to the nearest item, so an item
 * is never left half-way. Proximity only: a stop far from any item (or outside the section) stays where it is.
 * The points are absolute scroll positions, so they're placed again when the layout changes size.
 */
function useStepSnap({ section, enabled }: { section: React.RefObject<HTMLElement | null>; enabled: boolean }) {
  const lenis = useLenis();

  useEffect(() => {
    const element = section.current;
    if (!lenis || !enabled || !element) return;

    const snap = new Snap(lenis, { type: "proximity", distanceThreshold: "30%", duration: 0.7, debounce: 220 });
    let removers: (() => void)[] = [];

    function place() {
      if (!element) return;
      for (const remove of removers) remove();
      const top = element.getBoundingClientRect().top + window.scrollY;
      const step = (element.offsetHeight - window.innerHeight) / (ITEM_COUNT - 1);
      removers = Array.from({ length: ITEM_COUNT }, (_, index) => snap.add(Math.round(top + index * step)));
    }

    place();
    const observer = new ResizeObserver(place);
    observer.observe(document.body);
    return () => {
      observer.disconnect();
      snap.destroy();
    };
  }, [lenis, enabled, section]);
}

/*===== Step Count =====*/
/** «۳ از ۵»: where the visitor is in the pinned stretch. Decorative; the open item already says it. */
function StepCount({ shown, className }: { shown: number; className?: string }) {
  return (
    <p aria-hidden className={cn("shrink-0 font-display text-foreground/55 tabular-nums", className)}>
      {/* The current number brighter than the rest of the line: the message gives the order, a marker splits it. */}
      {m
        .home_teach_count({ current: "\u0000", count: formatNumber(ITEM_COUNT) })
        .split("\u0000")
        .map((part, index) =>
          index === 0 ? (
            <span key="before">{part}</span>
          ) : (
            <span key="after">
              <span className="text-foreground">{formatNumber(shown + 1)}</span>
              {part}
            </span>
          ),
        )}
    </p>
  );
}

/*===== Service Title =====*/
/**
 * A service's heading, big when its service is open. Growing it by font size re-wraps the words on every frame, so
 * the heading is always laid out at the open size (its line breaks never change) and a closed one is scaled down from
 * its start corner. A transform doesn't shrink the box, so the wrapper's height follows the measured heading times
 * the same factor. `--closed` is the closed size over the open one; the open size is fluid (FLUID.service), so the
 * ratio steps by width only, keeping closed headings readable on phones and quiet on wide screens.
 * `stacked`: below lg only the open service shows (StoryTeach), so every heading there is drawn at the open size.
 */
function ServiceTitle({ title, open, stacked }: { title: string; open: boolean; stacked: boolean }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;
    // offsetHeight ignores the transform, so it's always the open height.
    const observer = new ResizeObserver(() => setHeight(heading.offsetHeight));
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={height === undefined ? undefined : ({ "--h": `${height}px` } as React.CSSProperties)}
      className={cn(
        "transition-[height] duration-500 [--closed:.667] motion-reduce:transition-none md:[--closed:.6] xl:[--closed:.5]",
        height !== undefined && (open ? "h-(--h)" : "h-[calc(var(--h)*var(--closed))]"),
        stacked && "max-lg:h-auto",
      )}
    >
      {/* The start corner: the top right on the Persian pages, the top left on the English ones. */}
      <h3
        ref={headingRef}
        style={{ fontSize: FLUID.service }}
        className={cn(
          "origin-top-right font-display leading-[1.25] font-bold text-balance transition-[scale,color] duration-500 motion-reduce:transition-none ltr:origin-top-left",
          open ? "text-foreground" : "scale-(--closed) text-foreground/45",
          stacked && "max-lg:scale-100 max-lg:text-foreground",
        )}
      >
        {title}
      </h3>
    </div>
  );
}

/*===== Story Teach =====*/
/**
 * «چی می‌تونم یاد بگیرم؟» as a pinned scroll scene: the panel grows from a card to the whole screen as it arrives,
 * then holds while each service opens in turn and Fandogh changes pose for it. With reduced motion it's a plain
 * section with every service open.
 */
export function StoryTeach() {
  const items = teachItems();
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const pinned = !reduced;
  const [active, setActive] = useState(0);

  /*------ Arrival: card to full screen ------*/
  // From the panel's top entering at the bottom of the screen to it reaching the top, where it pins.
  const { scrollYProgress: arrival } = useScroll({ target: sectionRef, offset: ["start end", "start start"] });
  const insetY = useTransform(arrival, [0.25, 1], [6, 0]);
  const insetX = useTransform(arrival, [0.25, 1], [5, 0]);
  const radius = useTransform(arrival, [0.25, 1], [32, 0]);
  // Phones skip the top and bottom inset (`--st-clip-y: 0`): their heading sits in the top few svh, which the inset
  // would slice through while the card arrives.
  const clipPath = useMotionTemplate`inset(calc(${insetY}svh * var(--st-clip-y, 1)) ${insetX}vw round ${radius}px)`;

  /*------ Steps: which service is open ------*/
  const { scrollYProgress: steps } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  useMotionValueEvent(steps, "change", (progress) => {
    setActive(Math.min(ITEM_COUNT - 1, Math.max(0, Math.round(progress * (ITEM_COUNT - 1)))));
  });

  useStepSnap({ section: sectionRef, enabled: pinned });

  const shown = pinned ? active : 0;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="st-teach-title"
      style={pinned ? { height: `calc(100svh + ${(ITEM_COUNT - 1) * STEP_SVH}svh)` } : undefined}
      className="relative"
    >
      <div className={cn(pinned && "sticky top-0 h-svh")}>
        <motion.div
          // Remounted when the mode changes: the server renders the pinned card, and motion keeps a style it has bound
          // to a motion value even after the prop is gone.
          key={pinned ? "pinned" : "plain"}
          style={pinned ? { clipPath } : undefined}
          className={cn("bg-card max-lg:[--st-clip-y:0]", pinned ? "absolute inset-0" : "py-16")}
        >
          <div
            className={cn(
              "mx-auto grid h-full max-w-[88rem] gap-x-10 px-4 pt-[max(1.25rem,4svh)] pb-24 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-rows-[auto_1fr] lg:pb-20 xl:gap-x-16",
              // Pinned phones show one service at a time, so the plate takes whatever height that service leaves.
              pinned ? "grid-rows-[auto_minmax(0,1fr)_auto]" : "grid-rows-[auto_auto_1fr]",
            )}
          >
            {/* Sizes are fluid (FLUID); on short wide screens the intro is dropped too, as the open service needs the room. */}
            {/*------ Title ------*/}
            <header>
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="st-teach-title" style={{ fontSize: FLUID.title }} className={DISPLAY_HEADING}>
                  {m.home_teach_title()}
                </h2>
                {/* On phones the plate is too short for a page number beside the bubble, so it sits here. */}
                {pinned && <StepCount shown={shown} className="text-base md:text-lg lg:hidden" />}
              </div>
              <p
                style={{ fontSize: FLUID.intro }}
                className="mt-3 hidden max-w-[28em] leading-[1.75] text-foreground/70 md:block lg:[@media(max-height:46rem)]:hidden"
              >
                {m.home_teach_intro()}
              </p>
            </header>

            {/*------ The plate: Fandogh's training yard, one pose per service ------*/}
            {/* The panel reads as an open picture book: the text page on one side, this illustrated plate on the
                other, full height, with the step count as its page number. On phones it's a stage above the open
                service, filling the screen's spare height, with the bubble over his head. */}
            <div
              aria-hidden
              className={cn(
                "relative mt-4 overflow-hidden rounded-[1.5rem] border-2 border-foreground/10 bg-background paper-grain",
                "lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-auto lg:rounded-[2.5rem]",
                // Unpinned, the list runs long: the plate stays in view beside it instead of stretching down it.
                !pinned && "h-[min(24rem,55svh)] lg:sticky lg:top-8 lg:h-[36rem] lg:self-start",
              )}
            >
              {/*------ Scenery ------*/}
              {/* No sky objects: the black is the site's own colour, not night. A garland of pennants is strung across
                  the top, as over a yard on a training day, above two lines of hills, the far one fainter: tints of the
                  ink on the plate. Wide screens only, as the phone stage is too short. */}
              <svg viewBox="0 0 400 50" className="absolute inset-x-0 top-[11%] hidden w-full lg:block">
                <path
                  d="M0 6 Q200 46 400 6"
                  fill="none"
                  strokeWidth={1.5}
                  className="stroke-[color-mix(in_srgb,var(--foreground)_22%,var(--background))]"
                />
                {PENNANTS.map((d, index) => (
                  <path
                    key={d}
                    d={d}
                    className={cn(
                      "lively-pennant",
                      index % 3 === 1
                        ? "fill-[color-mix(in_srgb,var(--primary)_60%,var(--background))]"
                        : "fill-[color-mix(in_srgb,var(--foreground)_14%,var(--background))]",
                    )}
                  />
                ))}
              </svg>
              <svg
                viewBox="0 0 400 100"
                preserveAspectRatio="none"
                className="absolute inset-x-0 bottom-0 hidden h-[44%] w-full lg:block"
              >
                <path
                  d="M0 30 C50 10 100 12 150 26 S260 4 320 20 S380 22 400 14 V100 H0 Z"
                  className="fill-[color-mix(in_srgb,var(--foreground)_7%,var(--background))]"
                />
                <path
                  d="M0 58 C70 36 120 40 180 54 S290 30 345 44 S390 46 400 40 V100 H0 Z"
                  className="fill-[color-mix(in_srgb,var(--foreground)_12%,var(--background))]"
                />
              </svg>
              <MascotCut
                name="hedge"
                className="lively-sway absolute -bottom-[2%] -left-[6%] hidden w-[44%] lg:block"
              />
              <MascotCut
                name="hedge"
                className="lively-sway-2 absolute -right-[6%] -bottom-[2%] hidden w-[40%] -scale-x-100 lg:block"
              />
              <MascotCut
                name="ground"
                className="absolute bottom-[3%] left-[2%] w-[min(20rem,90%)] md:left-[6%] md:w-[60%] lg:bottom-[6%] lg:left-1/2 lg:w-[66%] lg:-translate-x-1/2"
              />
              <MascotCut
                name="plants"
                className="lively-sway absolute -bottom-[3%] -left-[3%] hidden w-[22%] lg:block"
              />
              <MascotCut
                name="plants"
                className="lively-sway-2 absolute -right-[3%] -bottom-[3%] w-24 -scale-x-100 md:w-32 lg:w-[20%]"
              />

              {pinned && (
                <StepCount shown={shown} className="absolute top-7 right-8 hidden text-lg lg:block xl:text-xl" />
              )}

              {/*------ Poses ------*/}
              {items.map((item, index) => {
                const on = index === shown;
                // Out first, then in: the old pose has faded before the new one appears, and the bubble follows it.
                const bubble = {
                  initial: false,
                  animate: { opacity: on ? 1 : 0, scale: on ? 1 : 0.92 },
                  transition: { duration: 0.3, delay: on ? 0.45 : 0 },
                } as const;
                return (
                  <Fragment key={item.id}>
                    {/* On phones the box stops short of the plate's top, which the bubble holds; a narrow plate has no
                        room for it beside his head. */}
                    <div className="absolute bottom-[6%] left-[2%] flex h-[calc(94%-5.5rem)] w-[min(20rem,90%)] items-end justify-center md:left-[6%] md:w-[60%] lg:inset-x-0 lg:bottom-[9%] lg:h-[60%] lg:max-h-[30rem] lg:w-auto">
                      <motion.div
                        initial={false}
                        animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
                        transition={{ duration: 0.3, delay: on ? 0.28 : 0 }}
                        style={{ height: `${item.rise * 100}%` }}
                        className="relative flex max-w-full justify-center"
                      >
                        <MascotCut
                          name={item.pose}
                          className="lively-breathe h-full w-auto max-w-full object-contain object-bottom"
                        />
                        {/* On wide screens the bubble sits by his head (he faces right); below lg it's on the plate (after this box). */}
                        <motion.div
                          {...bubble}
                          className={cn(
                            "absolute hidden origin-bottom-left lg:block",
                            item.bubbleAt ?? "bottom-[86%] left-[64%]",
                          )}
                        >
                          <ChalkBubble
                            tail="left"
                            className="lively-float whitespace-pre-line xl:px-5 xl:py-3 xl:text-xl"
                          >
                            {item.says}
                          </ChalkBubble>
                        </motion.div>
                      </motion.div>
                    </div>
                    {/* Placed on the plate, not off the dog's box, so it never runs past the plate's edge. On phones it
                        holds the top-right corner, over his head; on a tablet's wider plate it moves in to stay over
                        his head. */}
                    <motion.div
                      {...bubble}
                      className="absolute top-[4%] right-3 origin-bottom-left md:right-auto md:left-[46%] lg:hidden"
                    >
                      <ChalkBubble tail="left" className="lively-float max-w-[11rem] whitespace-pre-line md:max-w-none">
                        {item.says}
                      </ChalkBubble>
                    </motion.div>
                  </Fragment>
                );
              })}
            </div>

            {/*------ The services; the one in view is open ------*/}
            {/* Pinned phones stack every service in one cell and show only the open one: the old fades out, then the
                new fades in. The cell is as tall as the longest service, so the plate above doesn't jump. */}
            <div className="relative mt-5 lg:mt-8 lg:self-center">
              {/* The rail: its gold fill follows the scroll through the pinned stretch. */}
              {pinned && (
                <div aria-hidden className="absolute inset-y-0 start-0 w-0.5 bg-foreground/15">
                  <motion.div style={{ scaleY: steps }} className="h-full w-full origin-top bg-primary" />
                </div>
              )}
              <ul className={cn(pinned && "ps-5 max-lg:grid md:ps-7")}>
                {items.map((item, index) => {
                  const open = !pinned || index === active;
                  return (
                    <li
                      key={item.id}
                      style={{ paddingBlock: FLUID.gap }}
                      className={cn(
                        pinned &&
                          "motion-reduce:transition-none max-lg:transition-opacity max-lg:duration-300 max-lg:[grid-area:1/1]",
                        pinned && (open ? "max-lg:delay-300" : "max-lg:opacity-0"),
                      )}
                    >
                      <ServiceTitle title={item.title} open={open} stacked={pinned} />
                      {/* Collapsed by grid rows, not unmounted, so every service stays readable to a screen reader. */}
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-500 motion-reduce:transition-none",
                          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                          pinned && "max-lg:grid-rows-[1fr] max-lg:opacity-100",
                        )}
                      >
                        <div className="overflow-hidden">
                          <p
                            style={{ fontSize: FLUID.detail }}
                            className="pt-[0.75em] leading-[1.75] text-foreground/85"
                          >
                            {item.detail}
                          </p>
                          <ul
                            style={{ fontSize: FLUID.points }}
                            className="mt-3 space-y-1.5 pb-2 leading-[1.75] text-foreground/70 max-lg:[@media(max-height:44rem)]:hidden"
                          >
                            {item.points.map((point) => (
                              <li key={point} className="flex gap-2.5">
                                <span aria-hidden className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-primary" />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
