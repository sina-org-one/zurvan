import { Check, X } from "lucide-react";

import { GroundStrip } from "~/components/ground-strip";
import { MascotCut, type MascotCutName } from "~/components/mascot-cut";
import { BRICK } from "~/lib/brick";
import { DISPLAY_HEADING } from "~/lib/display-heading";
import { m } from "~/paraglide/messages";

/*===== Viewer Cards =====*/
// One card per person who can see the account's data: the visitor, Zurvan's site administrator and a partner. Each lists what that
// person sees; the partner's card also lists what they don't, because that is the question a customer asks. The partner
// lists follow what the partner's leads page really shows (`account_partner_leads/components/lead-row.tsx`): the
// customer's name and number, where they stand (registered, bought), and the commission's amount and whether it is paid;
// never a dog, an evaluation, the diary, a purchase or its price (app-spec F12). Reading the dogs' training for a
// customer's own referrer is designed, not built: it needs the owner's consent and wording (docs/overnight/
// 08-PARTNER-ACCESS-DESIGN.md).
const SEES = () => [m.privacy_sees_you_number(), m.privacy_sees_you_all()];

const TRAINER_SEES = () => [
  m.privacy_sees_trainer_all(),
  m.privacy_sees_trainer_payments(),
  m.privacy_sees_trainer_sms(),
];

const PARTNER_SEES = () => [
  m.privacy_sees_partner_numbers(),
  m.privacy_sees_partner_customers(),
  m.privacy_sees_partner_commission(),
];

const PARTNER_DOES_NOT_SEE = () => [
  m.privacy_not_partner_dogs(),
  m.privacy_not_partner_course(),
  m.privacy_not_partner_others(),
];

/*===== Stages =====*/
// The small scene at the top of each plate: the place where that person sees the data (the dimmed scenery), the dog in
// front of it and a bush. The scenery and the dog are placed with physical sides, since they are tied to the pictures
// (the dogs look to the right, towards the place). `place` is the box of the scenery, `dog` the dog's wrapper (it hops
// on the section's `:target`) and `idle` the loop on the picture itself. Written out whole for Tailwind to find.
type Stage = {
  place: { name: MascotCutName; className: string };
  dog: { name: MascotCutName; wrapper: string; idle: string };
  bush: string;
};

const STAGES = {
  // You: the house, the sitting dog beside the door.
  you: {
    place: { name: "home", className: "right-[3%] w-[58%]" },
    dog: { name: "sit", wrapper: "left-[14%] h-36", idle: "lively-breathe" },
    bush: "left-[2%] w-[17%]",
  },
  // Zurvan's administrator: the center, the dog with his notebook.
  trainer: {
    place: { name: "center", className: "right-[1%] w-[62%]" },
    dog: { name: "teach-advice", wrapper: "left-[6%] h-36", idle: "lively-tilt" },
    bush: "left-[1%] w-[15%]",
  },
  // The partner: the pet shop, the dog walking over with the shopping bag.
  partner: {
    place: { name: "petshop", className: "right-[3%] w-[54%]" },
    dog: { name: "shopping", wrapper: "left-[6%] h-32", idle: "lively-wiggle" },
    bush: "left-[0%] w-[15%]",
  },
} satisfies Record<string, Stage>;

/*===== Plate Stage =====*/
function PlateStage({ stage }: { stage: Stage }) {
  const { place, dog, bush } = stage;
  return (
    <div
      aria-hidden
      className="pointer-events-none relative h-48 overflow-hidden rounded-t-3xl border-b border-border/60"
    >
      {/* A pool of warm light where he stands. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_32%_80%,rgb(255_194_26/0.08),transparent)]" />
      <MascotCut name={place.name} className={`absolute bottom-[1.1rem] translate-y-[6%] ${place.className}`} />
      <GroundStrip className="absolute inset-x-0 bottom-0 h-7 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" />
      <MascotCut name="plants" className={`lively-sway absolute bottom-[1rem] translate-y-[6%] ${bush}`} />
      <div className={`pv-hop absolute bottom-[0.9rem] w-auto ${dog.wrapper}`}>
        <MascotCut name={dog.name} className={`${dog.idle} block h-full w-auto`} />
      </div>
    </div>
  );
}

/*===== Viewer Card =====*/
// A dark plate hanging on the wall (`bg-jet`, as the steps on Course Detail's wall), so the text stays legible on the
// brick. It reveals on scroll, each a few percent later than the one before (`pv-plate-*`, below).
function ViewerCard({
  title,
  sees,
  doesNotSee,
  stage,
  index,
  children,
}: {
  title: string;
  sees: string[];
  doesNotSee?: string[];
  stage: Stage;
  index: number;
  children?: React.ReactNode;
}) {
  return (
    <article
      className={`lively-reveal pv-plate-${index} flex flex-col rounded-3xl border border-border/50 bg-jet paper-grain shadow-[0_18px_36px_-18px_rgb(0_0_0/0.9)]`}
    >
      <PlateStage stage={stage} />

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-h3 font-black text-balance">{title}</h3>

        <p className="sr-only">{m.privacy_who_sees_sr()}</p>
        <ul className="mt-5 space-y-3">
          {sees.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check aria-hidden strokeWidth={2} className="mt-1 size-4 shrink-0 text-primary" />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>

        {doesNotSee && (
          <>
            <p className="mt-6 text-sm font-bold text-muted-foreground">{m.privacy_who_not_sees()}</p>
            <ul className="mt-3 space-y-3">
              {doesNotSee.map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <X aria-hidden strokeWidth={2} className="mt-1 size-4 shrink-0" />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {children}
      </div>
    </article>
  );
}

/*===== Who Sees Section =====*/
/**
 * The page's one brick band (full-bleed, with the light coping on top): the heading sits on the wall and the three
 * plates hang under it, side by side from lg and stacked on phones. The page leaves the band's own padding to this
 * component, and the `:target` hop of the three dogs is in `privacy.tsx`'s style.
 */
export function WhoSees() {
  return (
    <section
      id="who-sees"
      aria-labelledby="who-sees-title"
      style={{ backgroundImage: `var(--grain), ${BRICK}` }}
      className="scroll-mt-24 border-t-2 border-t-foreground/60 surface-inverse py-section-sm"
    >
      <div className="site-container">
        <h2 id="who-sees-title" className={`${DISPLAY_HEADING} text-h2 text-balance`}>
          {m.privacy_section_who_sees()}
        </h2>

        <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:items-start">
          <ViewerCard title={m.privacy_who_title_you()} sees={SEES()} stage={STAGES.you} index={1} />

          <ViewerCard title={m.privacy_who_title_trainer()} sees={TRAINER_SEES()} stage={STAGES.trainer} index={2}>
            <p className="mt-6 text-sm text-muted-foreground">{m.privacy_who_trainer_note()}</p>
          </ViewerCard>

          <ViewerCard
            title={m.privacy_who_title_partner()}
            sees={PARTNER_SEES()}
            doesNotSee={PARTNER_DOES_NOT_SEE()}
            stage={STAGES.partner}
            index={3}
          />
        </div>
      </div>

      {/* Staggered reveal: the plates stand side by side, so each starts its scroll range a little later than the one
          before. Where scroll timelines aren't supported they simply show. */}
      <style>{`
        @supports (animation-timeline: view()) {
          @media (prefers-reduced-motion: no-preference) {
            .pv-plate-2 { animation-range: entry 12% entry 82%; }
            .pv-plate-3 { animation-range: entry 19% entry 89%; }
          }
        }
      `}</style>
    </section>
  );
}
