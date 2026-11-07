import type { MascotCutName } from "~/components/mascot-cut";
import { m } from "~/paraglide/messages";

/*===== Guide Moods =====*/
// The center's dog takes the request to the center's trainer. He walks beside the form and his pose follows how far it has
// got; when it is sent he lies down by the phone to wait for the call. Each mood is one pose and one line, in his first
// person, informal spoken Persian (app-spec F3; the brief, Batch 5 §2). The lines are messages, so they are read when asked for
// (`guideFor`), never held in a module-level constant that would freeze the language it first loaded in.

export type GuideMood =
  /** Nothing picked yet. */
  | "pick"
  /** A dog picked, days or times missing. */
  | "when"
  /** Days and times picked, no files. */
  | "ready"
  /** A photo or video added. */
  | "photos"
  | "sending"
  /** A failed submit with errors on the fields (the client's or the server's). */
  | "failed"
  /** The server refused the request as a whole (the alert above the button says why). */
  | "serverFailed"
  | "sent"
  /** The account has no dog yet. */
  | "noDogs"
  /** Every dog is waiting for the call or was evaluated. */
  | "nothing";

/**
 * Where a pose stands and where his head is, so the bubble's tail lands on it. `width` is the cut-out's width in rem on
 * the desktop stage (kept under about 1.3x its natural width), `phone` on the phone band; `head` is how far across the
 * picture his head is, from its left edge (every pose faces right).
 */
export type Pose = {
  name: MascotCutName;
  width: number;
  phone: number;
  head: number;
  /**
   * The dimmed piece of scenery beside him that means something for this mood: behind him (his left, which leaves the
   * room over his head for the bubble) or in front of him (his right, what he is nosing at).
   */
  scenery?: { name: MascotCutName; width: number; phone: number; side: "back" | "front" };
};

const POSES = {
  wave: { name: "wave", width: 11, phone: 5.6, head: 0.5 },
  calendar: {
    name: "calendar",
    width: 14,
    phone: 7,
    head: 0.55,
    scenery: { name: "clock", width: 7.5, phone: 4.2, side: "back" },
  },
  envelope: { name: "envelope", width: 15.5, phone: 7.6, head: 0.78 },
  camera: {
    name: "camera",
    width: 12,
    phone: 6.2,
    head: 0.56,
    scenery: { name: "tripod", width: 8, phone: 4.4, side: "back" },
  },
  listen: { name: "listen", width: 9.5, phone: 4.2, head: 0.53 },
  "wait-phone": { name: "wait-phone", width: 19, phone: 9.6, head: 0.56 },
  sniff: {
    name: "sniff",
    width: 15,
    phone: 8,
    head: 0.84,
    scenery: { name: "kennel", width: 10.5, phone: 5.6, side: "front" },
  },
  watch: { name: "watch", width: 17, phone: 9, head: 0.8 },
} satisfies Record<string, Pose>;

/**
 * The pose and the line for a mood, in the page's language. A function, not a constant: the line is a message and
 * must be read while rendering.
 */
export function guideFor(mood: GuideMood): { pose: Pose; line: string } {
  switch (mood) {
    case "pick":
      return { pose: POSES.wave, line: m.assessment_guide_pick() };
    case "when":
      return { pose: POSES.calendar, line: m.assessment_guide_when() };
    case "ready":
      return { pose: POSES.envelope, line: m.assessment_guide_ready() };
    case "photos":
      return { pose: POSES.camera, line: m.assessment_guide_photos() };
    case "sending":
      return { pose: POSES.envelope, line: m.assessment_guide_sending() };
    case "failed":
      return { pose: POSES.listen, line: m.assessment_guide_failed() };
    case "serverFailed":
      return { pose: POSES.listen, line: m.assessment_guide_server_failed() };
    case "sent":
      return { pose: POSES["wait-phone"], line: m.assessment_guide_sent() };
    case "noDogs":
      return { pose: POSES.sniff, line: m.assessment_guide_no_dogs() };
    case "nothing":
      return { pose: POSES.watch, line: m.assessment_guide_nothing() };
  }
}

/*===== Next Steps =====*/
// What happens after the request, from the FAQ's «ارزیابی رایگان چیه؟» and «بعد از خرید» answers (app-spec F3, F5,
// F6). `label` is the stop's short name on the receipt's road; `line` the plain sentence.
export function nextSteps(): readonly { label: string; line: string }[] {
  return [
    { label: m.assessment_next_call_label(), line: m.assessment_next_call_line() },
    { label: m.assessment_next_courses_label(), line: m.assessment_next_courses_line() },
    { label: m.assessment_next_buy_label(), line: m.assessment_next_buy_line() },
  ];
}
