import { cn } from "cn";
import { useCallback, useEffect, useRef, useState } from "react";

import { CENTER } from "~/lib/contact";
import { BRICK } from "~/lib/brick";
import { ChalkBubble } from "~/components/chalk-bubble";
import { EvaluationButton } from "~/components/evaluation-button";
import { MascotCut } from "~/components/mascot-cut";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Typed Word =====*/
// The headline types what the dog learns at Zurvan, one skill at a time, each in its own colour. First person
// singular on purpose: «یاد بگیریم بشینیم» put the owner on the floor too. The colours are set by hand rather than
// taken from the palette: the palette's gold is the only accent, and the point is a change. The words are messages,
// read when the headline renders, in the page's language.
function typedWords() {
  return [
    { text: m.home_hero_word_sit(), color: "#FFC21A" },
    { text: m.home_hero_word_stay(), color: "#FFF4DC" },
    { text: m.home_hero_word_come(), color: "#FFD98A" },
    { text: m.home_hero_word_calm(), color: "#B9DDB0" },
    { text: m.home_hero_word_heel(), color: "#FFC21A" },
  ];
}

// Milliseconds per letter typed and erased, how long a whole word stays, and the beat before the next one starts.
const TYPE_MS = 110;
const ERASE_MS = 50;
const HOLD_MS = 1800;
const GAP_MS = 350;

/**
 * Types and erases `TYPED_WORDS` in turn, with a caret in the word's colour. The first word is rendered whole, so the
 * server's HTML and reduced motion both show a finished sentence; the loop starts by erasing it. Screen readers get
 * the whole list once (the h1 carries it), so the typed letters are hidden from them.
 */
function TypedWord() {
  const words = typedWords();
  const [{ word, chars, erasing }, setState] = useState(() => ({
    word: 0,
    chars: typedWords()[0]?.text.length ?? 0,
    erasing: false,
  }));
  const current = words[word] ?? words[0];
  const text = current?.text ?? "";

  /*------ One step per timeout ------*/
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const full = chars === text.length;
    const delay = erasing ? (chars === 0 ? GAP_MS : ERASE_MS) : full ? HOLD_MS : TYPE_MS;
    const timer = window.setTimeout(() => {
      if (!erasing) setState({ word, chars: full ? chars : chars + 1, erasing: full });
      else if (chars > 0) setState({ word, chars: chars - 1, erasing });
      else setState({ word: (word + 1) % words.length, chars: 0, erasing: false });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [word, chars, erasing, text, words.length]);

  const color = current?.color;
  // The caret holds still while letters move and blinks only while a whole word rests or the line is empty.
  const resting = (!erasing && chars === text.length) || chars === 0;

  return (
    <span aria-hidden className="whitespace-nowrap" style={{ color }}>
      {text.slice(0, chars)}
      <span
        className={`ms-1 inline-block h-[0.9em] w-[0.08em] translate-y-[0.12em] rounded-full bg-current ${resting ? "st-caret" : ""}`}
      />
    </span>
  );
}

/*===== Center's Name =====*/
/**
 * «زروان» in the headline with a gold chalk underline: the center the dog learns at (since 2026-11-06 the headline
 * names the center, not one trainer). The gold is a stroke under the word rather than in the letters: the typed word
 * below is already the headline's gold, and a gold name on top of it would make the first screen a bullion shop. The
 * stroke draws in the reading direction (right to left, mirrored on the English pages) as the end of the hero's one
 * load moment, just after the bubble has popped; with reduced motion it's simply there.
 */
function CenterName() {
  return (
    <span className="relative inline-block">
      {CENTER.name}
      <svg
        aria-hidden
        viewBox="0 0 120 14"
        fill="none"
        className="absolute top-[calc(100%-0.16em)] -right-[0.06em] w-[calc(100%+0.12em)] overflow-visible ltr:-scale-x-100"
      >
        <filter id="st-hero-chalk" x="-5%" y="-40%" width="110%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
          <feDisplacementMap in="SourceGraphic" scale={1.6} />
        </filter>
        {/* One quick stroke under the word and a shorter hook back, the way a hand underlines a name. */}
        <path
          d="M118 4.5C88 8 52 9 3 6.5C30 10.5 62 12 92 11"
          pathLength={1}
          stroke="var(--primary)"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#st-hero-chalk)"
          className="st-underline"
        />
      </svg>
    </span>
  );
}

/*===== Barking Dog =====*/
// A cut-out puppet's bark, not a video: hard cuts between three drawings of the same dog. The two bark frames are
// `paws` with only the head redrawn (turned to his left, towards the speech side, mouth open, then shut), composited
// onto the original body below the collar on the same canvas, so swapping whole images only moves the head.
// Milliseconds each frame holds: two quick «هاپ»s, then a beat with the mouth shut before he turns back.
const BARK = [
  { frame: "bark-open", ms: 170 },
  { frame: "bark-closed", ms: 120 },
  { frame: "bark-open", ms: 170 },
  { frame: "bark-closed", ms: 650 },
] as const;
type BarkFrame = (typeof BARK)[number]["frame"];
const BARK_FRAMES: BarkFrame[] = ["bark-open", "bark-closed"];

// He barks once by himself, a beat after the intro (the underline ends at 1.8s), then whenever he's petted or tapped.
const AUTO_BARK_MS = 3200;

/**
 * The hero dog, who barks. The bark frames load only after the page has loaded and are decoded before he may bark,
 * so a swap never shows an empty frame; until then (and always with reduced motion, where they never load) he's the
 * still `paws` and petting him does nothing. A bark in progress ignores new pets.
 */
function BarkingDog() {
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState<BarkFrame | null>(null);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const mountedAt = useRef(0);

  const bark = useCallback(() => {
    if (!ready || busy.current) return;
    busy.current = true;
    let at = 0;
    for (const step of BARK) {
      timers.current.push(window.setTimeout(() => setFrame(step.frame), at));
      at += step.ms;
    }
    timers.current.push(
      window.setTimeout(() => {
        setFrame(null);
        busy.current = false;
      }, at),
    );
  }, [ready]);

  /*------ Load the frames after the page ------*/
  useEffect(() => {
    mountedAt.current = performance.now();
    const list = timers.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const load = () => {
      const decoded = BARK_FRAMES.map((name) => {
        const img = new Image();
        img.src = `/photo/new-design/${name}.webp`;
        return img.decode();
      });
      // A frame that fails to load just leaves him still.
      Promise.all(decoded).then(
        () => !cancelled && setReady(true),
        () => {},
      );
    };
    if (document.readyState === "complete") load();
    else window.addEventListener("load", load, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", load);
      for (const timer of list) window.clearTimeout(timer);
    };
  }, []);

  /*------ The one bark by himself ------*/
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(bark, Math.max(0, AUTO_BARK_MS - (performance.now() - mountedAt.current)));
    return () => window.clearTimeout(timer);
  }, [ready, bark]);

  return (
    <>
      {/* The wrapper wiggles while the image rises, so the two animations don't fight over one transform. */}
      {/* On the English pages the whole scene is mirrored: the dog turns to face the other way. */}
      <div
        className="lively-wiggle lively-pet relative z-10 ltr:-scale-x-100"
        onPointerEnter={bark}
        onPointerDown={bark}
      >
        <MascotCut name="paws" eager className={cn("st-rise block w-full", frame && "invisible")} />
        {ready &&
          BARK_FRAMES.map((name) => (
            <MascotCut
              key={name}
              name={name}
              eager
              className={cn("absolute inset-0 w-full", frame !== name && "invisible")}
            />
          ))}
      </div>
      {/* The bark is a sound, so its bubble is decoration: the page says nothing new while he barks. */}
      {frame && (
        <div aria-hidden className="absolute top-[36%] right-[88%] z-20 ltr:right-auto ltr:left-[88%]">
          <ChalkBubble tail="start" className="st-bark px-3 py-1.5">
            {m.home_hero_bark()}
          </ChalkBubble>
        </div>
      )}
    </>
  );
}

/*===== Hero =====*/
// "The mascot lives in the layout": the paws image is cut flat at the chest, 87% down, which is exactly where the sage
// card's top edge sits. The card is behind the image (z-0 vs z-10), so the paws drape over its border while the body
// seems to stand behind it. Card geometry hangs off the image box (`top-[87%]`), so it holds at every size.
//
// From lg up the hero is exactly one laptop screen, from a 1280×720 to a 2560×1600 at 150%:
// the section takes the screen less the header (4.75rem) and the 2.25rem of ground showing under it, the grid
// stretches so the card lands on its bottom, and the dog and headline are sized by the screen's height. The dog's
// height is the screen less 13.5rem (header, ground, the card's 5rem below him and a little air), times 285/463 for
// his width. He stops at 23rem, ~1.3x the cut-out's natural width, so a tall screen gets air rather than a soft dog:
// the dog and copy are centred in the height, and the card runs down to the section's bottom (clipped there, under
// the ground), so the spare height is shared between the air above him and the card below.
//
// Below lg the whole hero fits the first screen too (the user, 2026-10-24): the section takes the screen less the
// app bar (4.625rem), and the dog stands the tab bar's height (`--tab-bar-space`) above its bottom, so his paws and the
// wall's top edge show above the bar. `svh` is the screen with the browser's own bars shown, the smallest it gets, so
// nothing hides behind an address bar or toolbar on the first load. The copy is tightened and the headline follows
// the height; the dog takes what is left (`--dog-w`, the height less what the rest needs, times his width per height,
// fitted on 548px to 1024px tall screens), between a small floor and his old sizes.
export function StoryHero() {
  return (
    <section
      aria-labelledby="st-hero-title"
      className="relative flex min-h-[calc(100svh-4.625rem)] flex-col overflow-x-clip lg:min-h-[calc(100svh-7rem)] lg:overflow-clip"
    >
      {/* The one load moment: he rises from behind the card edge, then the bubble pops. Off for reduced motion. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .st-rise { animation: st-rise .9s cubic-bezier(.2,.8,.25,1) both; }
          /* It pops in, then floats (the shared lively-float keyframes): the float comes second, so it wins once it starts. */
          .st-pop { animation: st-pop .45s cubic-bezier(.3,1.5,.5,1) .75s both, lively-float 3.4s ease-in-out 1.3s infinite alternate; transform-origin: 85% 100%; }
        }
        @keyframes st-rise {
          from { transform: translateY(34%); clip-path: inset(-200px -200px 13% -200px); }
          to { transform: none; clip-path: inset(-200px -200px 0 -200px); }
        }
        @keyframes st-pop { from { transform: scale(.4); opacity: 0; } to { transform: none; opacity: 1; } }
        /* Starts as the bubble lands (.75s + .45s). */
        @media (prefers-reduced-motion: no-preference) {
          .st-underline { stroke-dasharray: 1; animation: st-underline .6s cubic-bezier(.5,0,.3,1) 1.2s both; }
        }
        @keyframes st-underline { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        /* The bark bubble bursts out from its tail, by his mouth. */
        .st-bark { animation: st-bark .18s cubic-bezier(.3,1.6,.5,1) both; transform-origin: 85% 100%; }
        @keyframes st-bark { from { transform: scale(.3) rotate(-6deg); opacity: 0; } to { transform: rotate(-6deg); opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) { .st-caret { animation: st-caret 1s steps(1) infinite; } }
        /* The English pages mirror the scene, so the bubbles grow from their tails on the other side. */
        [dir="ltr"] .st-pop, [dir="ltr"] .st-bark { transform-origin: 15% 100%; }
        [dir="ltr"] .st-bark { rotate: 12deg; }
        @keyframes st-caret { 50% { opacity: 0; } }
      `}</style>

      {/* Foliage in the copy's bottom corner, as in the mockup; the card covers that corner on narrow screens. */}
      <div aria-hidden className="absolute -start-6 bottom-0 hidden w-40 lg:block xl:w-48">
        <MascotCut name="plants" eager className="lively-sway w-full" />
      </div>

      {/* Below lg the copy's row takes the spare height and the copy is centred in it; the dog keeps to the bottom. */}
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-rows-[1fr_auto] items-end gap-x-6 px-4 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:grid-rows-none lg:items-center">
        {/*------ Copy ------*/}
        {/* Centred until the copy has a column of its own on lg; hung on the right edge, it left the screen's left half
            empty. */}
        <div className="self-center pt-5 pb-5 text-center sm:pt-10 sm:pb-8 lg:self-auto lg:pt-[clamp(1rem,4svh,4rem)] lg:pb-[clamp(3.5rem,11svh,6rem)] lg:text-start">
          {/* On lg, the headline follows the height too (with a rem part, so browser zoom still enlarges it), and
              the width on a narrow lg screen, where its column is tight. */}
          <h1
            id="st-hero-title"
            className={cn(
              DISPLAY_HEADING,
              "text-[clamp(2.1rem,5.4svh,2.6rem)] sm:text-[clamp(2.6rem,5.4svh,3.75rem)] lg:text-[clamp(2.75rem,calc(0.5rem+min(7.5svh,5.2vw)),4.5rem)]",
              // After the sizes: `cn` lets a later font size drop an earlier `leading-*`. Taller than DISPLAY_HEADING's 1.2,
              // so the underline under «زروان» clears the «گ» on the line below.
              "leading-[1.4]",
            )}
          >
            {/* No «سلام» here: the bubble beside him already says it. */}
            {m.home_hero_title_with()} <CenterName />
            <br />
            {m.home_hero_title_learn()}
            {/* The typed word gets its own line, so the line's length changes and nothing else moves. */}
            <br />
            <span className="sr-only">{m.home_hero_title_words()}</span>
            <TypedWord />
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-foreground/80 sm:mt-5 sm:text-lg sm:leading-8 lg:mx-0">
            {m.home_hero_line_one()}
            <br />
            {m.home_hero_line_two()}
          </p>
          <EvaluationButton className="mt-5 sm:mt-7" />
        </div>

        {/*------ Mascot on the card edge ------*/}
        {/* Below lg the dog and his bubble are centred as one group: the bubble (9.5rem, 11rem from sm) starts 78% of
            the way across him, so it overhangs his left side by its width less 22% of his, and he moves right by half
            that (`--dog-shift`). On the English pages the scene is a mirror image: the dog faces the other way, the
            bubble and the wall swap sides, and he leans on the column's start. */}
        <div className="relative mx-auto mb-(--tab-bar-space) w-(--dog-w) translate-x-(--dog-shift) [--dog-shift:calc((9.5rem-var(--dog-w)*0.22)/2)] [--dog-w:clamp(7.5rem,calc((100svh-26rem)*0.48),13.5rem)] sm:[--dog-shift:calc((11rem-var(--dog-w)*0.22)/2)] sm:[--dog-w:clamp(10rem,calc((100svh-30.5rem)*0.48),18rem)] lg:mr-0 lg:mb-20 lg:ml-auto lg:w-[clamp(15rem,calc((100svh-13.5rem)*0.615),23rem)] lg:translate-x-0 ltr:-translate-x-(--dog-shift) ltr:lg:mr-auto ltr:lg:ml-0 ltr:lg:translate-x-0">
          {/* The card is a brick wall he looks over, with the page's grain on the bricks. */}
          <div
            aria-hidden
            style={{ backgroundImage: `var(--grain), ${BRICK}` }}
            className="absolute -start-[45%] -end-[100vw] top-[87%] -bottom-(--tab-bar-space) z-0 rounded-ss-[3rem] border-t-2 border-foreground/70 bg-inverse lg:-bottom-[100svh]"
          />
          {/* The bushes are a share of the dog's width (on lg their sizes at his 21rem), so they shrink with him. */}
          <MascotCut
            name="plants"
            eager
            className="lively-sway absolute start-[78%] bottom-[10%] z-[5] w-[74%] sm:w-[67%]"
          />
          <MascotCut
            name="plants"
            eager
            className="lively-sway-2 absolute end-[78%] bottom-[8%] z-[5] w-[52%] -scale-x-100 sm:w-[55%] lg:w-[52%]"
          />
          <BarkingDog />
          {/* `max-w-none`: the bubble is wider than a phone's smaller dog, and would otherwise be held to his width. */}
          <ChalkBubble
            tail="start"
            className="st-pop absolute start-[78%] top-[2%] z-20 w-[9.5rem] max-w-none sm:w-44 lg:w-52"
          >
            {m.home_hero_bubble()}
          </ChalkBubble>
        </div>
      </div>
    </section>
  );
}
