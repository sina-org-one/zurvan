import { toPersianDigits } from "~/lib/digits";
import { isoToJalali, todayIso } from "~/lib/jalali";
import { m } from "~/paraglide/messages";
import { getLocale } from "~/paraglide/runtime";

/*===== Zurvan's Years =====*/
// Since 2026-11-06 the site speaks for زروان, the center, not for one person: the center may have several trainers, and
// the storefront, the footer and About count the years from the center's start. The year is the one the owner gave for
// the work with dogs («از سال ۱۳۹۳», 2026-10-20; was ۱۳۹۲ until 2026-10-26), kept as the center's start.
export const ZURVAN_SINCE = {
  /** The year (Solar Hijri) the center started working with dogs. */
  since: 1393,
  /** The same year in the Gregorian calendar (1393 began in March 2014), for the English pages. */
  sinceGregorian: 2014,
  /**
   * Years since `since`, counted from today's Jalali year in Tehran, so it goes up by one at Nowruz without an edit.
   * Tehran time (not the visitor's zone) keeps the server render and the browser on the same number.
   */
  get years() {
    return isoToJalali(todayIso()).year - this.since;
  },
  /** «۱۳۹۳» on the Persian pages, «2014» on the English ones: the year in the page's own calendar and digits. */
  get sinceYear() {
    return getLocale() === "fa" ? toPersianDigits(String(this.since)) : String(this.sinceGregorian);
  },
};

/*===== Head Trainer =====*/
// One of Zurvan's trainers, introduced as «مربی ارشد زروان»: the owner, who founded the center and is the app's Admin.
// She is not the only trainer and the copy never says she is (the owner, 2026-11-06): pages speak in the center's
// voice («از زروان باهات تماس می‌گیریم», «مربی‌های زروان») and list her in `TRAINERS`. Blog posts still carry her as
// their author, and course pages show her avatar.
//
// Name, experience and credentials supplied on the owner's business card. The photos are edits (2026-10-22) of the two
// the owner sent on 2026-10-19: the same face, but a trainer's everyday clothes and a daylight training field in place
// of the tactical outfit, the sunset and the branded truck and banners, so they read as the trainer at work rather than
// an advert. 1024x1536, served at 480, 720 and 1024. The owner hasn't seen the edits yet, and which photo is the chosen
// introduction photo is still open (docs/overnight/03-DECISIONS-NEEDED.md): to swap them, swap the two entries below.
//
// The words are messages (`messages/shared/`), read through getters, so each read is in the page's language and every
// caller keeps writing `HEAD_TRAINER.name`. Read them while rendering, never into a module-level constant: that would
// freeze the language the module happened to load in.
export const HEAD_TRAINER = {
  get name() {
    return m.shared_trainer_name();
  },
  /** Used where the page speaks about the trainer casually: "ارزیابی رایگان با طلا". */
  get firstName() {
    return m.shared_trainer_first_name();
  },
  get role() {
    return m.shared_trainer_role();
  },
  /** Her place in the team, on the trainers' cards: «مربی ارشد زروان». */
  get label() {
    return m.shared_trainer_label();
  },
  /**
   * Years since `since`, counted from today's Jalali year in Tehran, so it goes up by one at Nowruz without an edit.
   * Tehran time (not the visitor's zone) keeps the server render and the browser on the same number.
   */
  get years() {
    return isoToJalali(todayIso()).year - this.since;
  },
  /** The year (Solar Hijri) she started working with dogs, the same as the center's (`ZURVAN_SINCE`). */
  since: ZURVAN_SINCE.since,
  sinceGregorian: ZURVAN_SINCE.sinceGregorian,
  /** «۱۳۹۳» on the Persian pages, «2014» on the English ones. */
  get sinceYear() {
    return ZURVAN_SINCE.sinceYear;
  },
  get credential() {
    return m.shared_trainer_credential();
  },
  /**
   * The slogan printed on the owner's card. It is recorded here and not shown: the site still carries the Persian
   * «تجربه، دانش، نتیجه.» (Services section) until the owner gives final approval to replace it.
   */
  cardSlogan: "EXPERIENCE. KNOWLEDGE. RESULT.",
  photos: {
    /** Kneeling with a hand on the dog's chest, the dog looking up at her. Her print in the home page's trainers section. */
    withDog: {
      src: "/photo/trainer/tala-dog-720.webp",
      srcSet:
        "/photo/trainer/tala-dog-480.webp 480w, /photo/trainer/tala-dog-720.webp 720w, /photo/trainer/tala-dog-1024.webp 1024w",
      width: 1024,
      height: 1536,
      get alt() {
        return m.shared_trainer_photo_with_dog_alt();
      },
    },
    /** Standing with the leash, the dog sitting at her side and looking up at her. Her print on the About page's trainers. */
    standing: {
      src: "/photo/trainer/tala-standing-720.webp",
      srcSet:
        "/photo/trainer/tala-standing-480.webp 480w, /photo/trainer/tala-standing-720.webp 720w, /photo/trainer/tala-standing-1024.webp 1024w",
      width: 1024,
      height: 1536,
      get alt() {
        return m.shared_trainer_photo_standing_alt();
      },
    },
    /** A square around the face in `withDog`, for the small round picture on course pages. Decorative (empty alt). */
    avatar: {
      src: "/photo/trainer/tala-avatar-192.webp",
      width: 192,
      height: 192,
    },
  },
} as const;

/*===== Trainers =====*/
type TrainerPhoto = {
  readonly src: string;
  readonly srcSet: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
};

/** One of Zurvan's trainers, as the trainers' sections show them (home and About). */
export type Trainer = {
  readonly name: string;
  readonly firstName: string;
  /** Their place in the team, e.g. «مربی ارشد زروان». */
  readonly label: string;
  readonly role: string;
  readonly credential: string;
  readonly photos: { readonly withDog: TrainerPhoto; readonly standing: TrainerPhoto };
};

/**
 * Zurvan's trainers, in the order the pages list them, the head trainer first. Only she is known for now; a colleague
 * joins by adding an entry (messages in `messages/shared/`, photos in `public/photo/trainer/`). The sections are built
 * to look right with one entry and to wrap with several. Never invent a trainer to fill the row.
 */
export const TRAINERS: readonly Trainer[] = [HEAD_TRAINER];
