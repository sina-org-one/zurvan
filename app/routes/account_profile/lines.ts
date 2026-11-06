import { m } from "~/paraglide/messages";
import type { ProfileCard, VoiceMood } from "~/routes/account_profile/hooks/use-card-voice";

/*===== The Dogs' Lines =====*/
// Informal spoken Persian, in the center's dog's first person: short, no orders, no promises. Each card's plain
// description says the same thing in words a screen reader reads, so the bubbles are for the eyes only. Read when
// called, so they follow the page's language.
function introLine(card: ProfileCard): string {
  if (card === "name") return m.account_profile_voice_intro_name();
  if (card === "password") return m.account_profile_voice_intro_password();
  return m.account_profile_voice_intro_sheba();
}

/** What a card's dog says in a mood. */
export function cardLine({ card, mood }: { card: ProfileCard; mood: VoiceMood }): string {
  if (mood === "error") return m.account_profile_voice_error();
  if (mood === "saved") return m.account_profile_voice_saved();
  return introLine(card);
}
