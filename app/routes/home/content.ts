import { m } from "~/paraglide/messages";

/*===== Content =====*/
// The real facts the new design tells, taken from the live home page. The wording is spoken Persian (`می‌شه`, `رو`),
// the register the dog uses in his bubbles, so the page reads as one voice; the facts (what happens, in what order,
// what is offered) stay. Plain and concrete on purpose: the owner's customers found abstract lines («با حوصله و دقت»,
// «گزینه‌های انعطاف‌پذیر») machine-written (2026-10-20). The words are messages (`messages/home/`), so these are
// functions: each list is worded in the page's language when it renders.

/** The path from a new dog to training (app-spec F3, F5, F6). A real sequence, so the trail numbers it. */
export function steps() {
  return [
    { title: m.home_step_request_title(), detail: m.home_step_request_detail() },
    { title: m.home_step_call_title(), detail: m.home_step_call_detail() },
    { title: m.home_step_open_title(), detail: m.home_step_open_detail() },
    { title: m.home_step_train_title(), detail: m.home_step_train_detail() },
  ];
}

/** The five services from the owner's business card. All breeds and ages. `id` keys each one's scene. */
export function services() {
  return [
    { id: "basic", title: m.home_service_basic_title(), detail: m.home_service_basic_detail() },
    { id: "behavior", title: m.home_service_behavior_title(), detail: m.home_service_behavior_detail() },
    { id: "specialist", title: m.home_service_specialist_title(), detail: m.home_service_specialist_detail() },
    { id: "competition", title: m.home_service_competition_title(), detail: m.home_service_competition_detail() },
    { id: "advice", title: m.home_service_advice_title(), detail: m.home_service_advice_detail() },
  ] as const;
}

export type ServiceId = ReturnType<typeof services>[number]["id"];

/**
 * Where training happens, as the help page words it. Group classes aren't running: never present them as open, and
 * boarding is only by prior arrangement.
 */
export function formats() {
  return [
    { title: m.home_format_home_title(), detail: m.home_format_home_detail() },
    { title: m.home_format_center_title(), detail: m.home_format_center_detail() },
    { title: m.home_format_boarding_title(), detail: m.home_format_boarding_detail() },
  ];
}

/** The live app's pages every CTA must point at. */
export const LINKS = {
  evaluation: "/assessment",
  courses: "/courses",
  auth: "/auth",
  about: "/about",
  contact: "/contact",
  help: "/help",
} as const;
