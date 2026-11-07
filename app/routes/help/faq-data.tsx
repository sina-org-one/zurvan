import { Link } from "~/components/link";
import { CENTER_PHONE } from "~/lib/contact";
import { m } from "~/paraglide/messages";

/*===== Types =====*/
export type FaqQuestion = {
  /** The URL anchor (`/help#how-buying-works`). Other pages link to these, so never rename one. */
  id: string;
  question: string;
  /** Plain body copy: the dog speaks in the headings and the bubble, never in the answers. */
  answer: React.ReactNode;
};

export type FaqGroupData = {
  /** The URL anchor of the group, and the road stop that leads to it. */
  id: string;
  /** The road step this group is, or `null` for a group that isn't a step (the account). */
  step: number | null;
  /** The dog's heading. */
  title: string;
  questions: FaqQuestion[];
};

/*===== Shared Pieces =====*/
// Not components: the answers are plain JSX, and the same few links come up again and again.

/** A link inside an answer, below the text it belongs to. */
const LINK_CLASS = "inline-block font-bold text-primary underline underline-offset-4";

/**
 * The center's number as a link. A component, not a module-level element: the number's digits follow the page's
 * language, and an element built once at import would keep the language the module was first loaded in (the server's
 * Persian), so an English page hydrated with mismatched digits.
 */
function PhoneLink() {
  return (
    <a
      href={`tel:${CENTER_PHONE.tel}`}
      dir="ltr"
      className="font-bold text-primary underline underline-offset-4 ltr:whitespace-nowrap"
    >
      {CENTER_PHONE.display}
    </a>
  );
}

/** The link to the evaluation request. */
function EvaluationLink() {
  return (
    <Link to="/assessment" className={LINK_CLASS}>
      {m.help_link_evaluation()}
    </Link>
  );
}

/*===== Groups =====*/
// In road order (`road.tsx`). Facts only from docs/app-spec.md F1 to F6, as the approved brief words them: no refund
// rules or timings, no calendar, no deadlines, nothing about groups or a venue.
// A function, not a constant: the messages answer in the language of the page being rendered.
export function getFaqGroups(): FaqGroupData[] {
  return [
    /*------ 1: Evaluation ------*/
    {
      id: "evaluation",
      step: 1,
      title: m.help_group_evaluation_title(),
      questions: [
        {
          id: "first-step",
          question: m.help_q_first_step_question(),
          answer: (
            <>
              <p>{m.help_q_first_step_answer()}</p>
              <EvaluationLink />
            </>
          ),
        },
        {
          id: "what-is-evaluation",
          question: m.help_q_what_is_evaluation_question(),
          answer: (
            <>
              <p>{m.help_q_what_is_evaluation_a1()}</p>
              <p className="mt-3">{m.help_q_what_is_evaluation_a2()}</p>
              <p className="mt-3">{m.help_q_what_is_evaluation_a3()}</p>
            </>
          ),
        },
        {
          id: "evaluation-rejected",
          question: m.help_q_evaluation_rejected_question(),
          answer: <p>{m.help_q_evaluation_rejected_answer()}</p>,
        },
      ],
    },

    /*------ 2: Courses ------*/
    {
      id: "courses",
      step: 2,
      title: m.help_group_courses_title(),
      questions: [
        {
          id: "which-courses",
          question: m.help_q_which_courses_question(),
          answer: (
            <>
              <p>{m.help_q_which_courses_answer()}</p>
              <Link to="/courses" className={LINK_CLASS}>
                {m.help_link_all_courses()}
              </Link>
            </>
          ),
        },
        {
          id: "why-locked",
          question: m.help_q_why_locked_question(),
          answer: (
            <>
              <p>{m.help_q_why_locked_intro()}</p>
              <ul className="mt-3 list-disc space-y-2 ps-6 marker:text-primary">
                <li>{m.help_q_why_locked_r1()}</li>
                <li>{m.help_q_why_locked_r2()}</li>
                <li>{m.help_q_why_locked_r3()}</li>
                <li>{m.help_q_why_locked_r4()}</li>
              </ul>
            </>
          ),
        },
        {
          id: "price",
          question: m.help_q_price_question(),
          answer: <p>{m.help_q_price_answer()}</p>,
        },
        {
          id: "no-price",
          question: m.help_q_no_price_question(),
          answer: (
            <>
              <p>{m.help_q_no_price_a1()}</p>
              <p className="mt-3">
                {m.help_q_no_price_a2()} <PhoneLink />
              </p>
            </>
          ),
        },
      ],
    },

    /*------ 3: Paying ------*/
    {
      id: "paying",
      step: 3,
      // The dog's heading. It used to lead with the payment («اول پرداخت، بعد تماس»), which the owner said feels bad. The
      // order itself is unchanged and the answers below say it plainly: the purchase comes first, then the call.
      title: m.help_group_paying_title(),
      questions: [
        {
          id: "how-buying-works",
          question: m.help_q_how_buying_works_question(),
          answer: (
            <>
              {/* Persian numerals for the Persian list; the English list counts in Latin digits. */}
              <ol className="list-[persian] space-y-2 ps-6 marker:font-bold marker:text-primary ltr:list-decimal">
                <li>{m.help_q_how_buying_works_s1()}</li>
                <li>{m.help_q_how_buying_works_s2()}</li>
                <li>{m.help_q_how_buying_works_s3()}</li>
                <li>{m.help_q_how_buying_works_s4()}</li>
              </ol>
              <p className="mt-4">{m.help_q_how_buying_works_outro()}</p>
            </>
          ),
        },
        {
          id: "cart",
          question: m.help_q_cart_question(),
          answer: <p>{m.help_q_cart_answer()}</p>,
        },
        {
          id: "several",
          question: m.help_q_several_question(),
          answer: <p>{m.help_q_several_answer()}</p>,
        },
        {
          id: "payment-failed",
          question: m.help_q_payment_failed_question(),
          answer: <p>{m.help_q_payment_failed_answer()}</p>,
        },
        {
          id: "after-paying",
          question: m.help_q_after_paying_question(),
          answer: (
            <>
              <p>{m.help_q_after_paying_answer()}</p>
              <Link to="/account/purchases" className={LINK_CLASS}>
                {m.help_link_purchases()}
              </Link>
            </>
          ),
        },
        {
          id: "cant-take",
          question: m.help_q_cant_take_question(),
          // Exactly this and nothing more: no timing, no policy. The money goes back outside the site; the site records it.
          answer: <p>{m.help_q_cant_take_answer()}</p>,
        },
      ],
    },

    /*------ 4: Training ------*/
    {
      id: "training",
      step: 4,
      title: m.help_group_training_title(),
      questions: [
        {
          id: "lessons",
          question: m.help_q_lessons_question(),
          answer: (
            <>
              <p>{m.help_q_lessons_intro()}</p>
              <ul className="mt-3 list-disc space-y-2 ps-6 marker:text-primary">
                <li>
                  <strong>{m.help_q_lessons_home_label()}</strong> {m.help_q_lessons_home_text()}
                </li>
                <li>
                  <strong>{m.help_q_lessons_center_label()}</strong> {m.help_q_lessons_center_text()}
                </li>
                <li>
                  <strong>{m.help_q_lessons_group_label()}</strong> {m.help_q_lessons_group_text()}
                </li>
                <li>
                  <strong>{m.help_q_lessons_boarding_label()}</strong> {m.help_q_lessons_boarding_text()}
                </li>
              </ul>
              <p className="mt-4">{m.help_q_lessons_where()}</p>
              <p className="mt-4">{m.help_q_lessons_times()}</p>
            </>
          ),
        },
        {
          id: "logbook",
          question: m.help_q_logbook_question(),
          answer: (
            <>
              <p>{m.help_q_logbook_answer()}</p>
              <Link to="/account" className={LINK_CLASS}>
                {m.help_link_my_dogs()}
              </Link>
            </>
          ),
        },
        {
          id: "boarding",
          question: m.help_q_boarding_question(),
          answer: <p>{m.help_q_boarding_answer()}</p>,
        },
      ],
    },

    /*------ 5: Done ------*/
    {
      id: "done",
      step: 5,
      title: m.help_group_done_title(),
      questions: [
        {
          id: "course-done",
          question: m.help_q_course_done_question(),
          answer: <p>{m.help_q_course_done_answer()}</p>,
        },
      ],
    },

    /*------ Account (not a step) ------*/
    {
      id: "account",
      step: null,
      title: m.help_group_account_title(),
      questions: [
        {
          id: "sign-in",
          question: m.help_q_sign_in_question(),
          answer: (
            <>
              <p>{m.help_q_sign_in_a1()}</p>
              <p>{m.help_q_sign_in_a2()}</p>
              <Link to="/privacy" className={LINK_CLASS}>
                {m.help_link_privacy()}
              </Link>
            </>
          ),
        },
        {
          id: "code-not-arrived",
          question: m.help_q_code_not_arrived_question(),
          // No numbers for the hourly request limits: those are Admin settings.
          answer: <p>{m.help_q_code_not_arrived_answer()}</p>,
        },
      ],
    },
  ];
}

/**
 * Every question's anchor, for the hash hook. A fixed list (the anchors never change with the language), in page order;
 * kept next to the groups above so a new question gets both.
 */
export const QUESTION_IDS = [
  "first-step",
  "what-is-evaluation",
  "evaluation-rejected",
  "which-courses",
  "why-locked",
  "price",
  "no-price",
  "how-buying-works",
  "cart",
  "several",
  "payment-failed",
  "after-paying",
  "cant-take",
  "lessons",
  "logbook",
  "boarding",
  "course-done",
  "sign-in",
  "code-not-arrived",
];
