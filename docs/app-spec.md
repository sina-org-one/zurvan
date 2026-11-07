# Zurvann — App Specification

The source of truth for how the app works. The course catalog's content comes from [zurvan-courses.md](zurvan-courses.md); a course's settings are still being worked out with the owner (see [F8](#f8-course-catalogue)); the dog profile's fields were settled on 2026-10-25 ([F2](#f2-dog-profiles)).

**How to read it.** The spec is organized by **feature**, because one page often holds several features and one feature often shows up on several pages. Each feature says who uses it, its rules, its edge cases and the pages it appears on. [Pages](#pages) at the end lists every page with the features on it. Refer to a feature by its number (`F5`) in code comments and commits.

**Words.** A **course** is an item in the catalogue («دوره»): House manner, CGC. An **enrollment** is one dog taking one course: Leo's CGC. Buying a course for a dog creates an enrollment; completion and cancellation belong to the enrollment. The Persian UI can say «دوره» for both.

---

## The Business

**Zurvann** (زروان) is a dog-training and behavior center, and since 2026-11-06 a part of a larger services platform (the owner's decision; the platform isn't named on the site yet). The site sells **the center**, not one person: it may have more than one trainer (`TRAINERS` in `app/lib/head-trainer.ts`; Tala Rasti, the head trainer, is the first), and the copy speaks as «زروان» / «ما» / «مربی زروان». The owner is the app's **Admin**. Training is mostly private (one dog), at the client's place or at the center; the owner also plans group classes at the center and offers boarding by prior arrangement with a partner pension, but the app has no seats, schedule or booking for any of that.

The app is a **small shop with locked items**. A new dog starts with a **free evaluation**, a first checkup where she gets to know the dog. Once a dog is evaluated, its owner can **buy courses** for it, as long as it has passed each course's prerequisites. Courses have a **fixed price** and are **paid upfront**. After a purchase the Admin calls the customer, and when the training is over she marks the enrollment **done**, which unlocks the next courses. **Partners** (clinics, groomers, pet shops) bring in customers and earn a commission on every purchase those customers make, at a percent that climbs with the number of paying customers the partner has brought.

**The app doesn't run the business.** Lesson times, sessions and everything in between are handled by the Admin in real life, by phone. The app records what was requested, bought and finished, and shows her the general picture. There is no calendar, no lesson tracking, no trainer earnings, no refund policies, no deadlines and no automatic expiries. A refund the Admin decides is recorded ([F5](#f5-cart-and-checkout)); the money itself moves outside the app.

## Roles

| Role                     | Who                                                                      |
| ------------------------ | ------------------------------------------------------------------------ |
| **Admin** (owner)        | Runs everything. The only staff account.                                 |
| **Partner**              | A clinic, groomer or pet shop that brings in customers for a commission. |
| **Customer** (dog owner) | Manages their dogs, requests evaluations, buys courses.                  |

| Feature                             | Customer |  Partner  |       Admin        |
| ----------------------------------- | :------: | :-------: | :----------------: |
| Dog profiles (F2)                   |   Own    |     —     |        All         |
| Evaluation (F3)                     | Requests |     —     | Evaluates, rejects |
| Cart and checkout (F5)              |    ✅    |     —     |         —          |
| Enrollments (F6)                    |   Own    |     —     | Completes, cancels |
| Referral link, QR, phone leads (F7) |    —     |    ✅     |         ✅         |
| Commissions (F7)                    |    —     | Own, read |  All, marks paid   |
| Blog (F16)                          |  Reads   |   Reads   | Writes, publishes  |

---

## Features

### F1. Sign-in and Accounts

**Who:** everyone.

- Sign in with a phone number and an SMS code. Already built: 5-digit code, valid for 2 minutes, resend after 60 seconds, invalidated after 5 wrong attempts, rate-limited per phone and per IP.
- One role per phone number. Only customers self-register; a partner account is made by the Admin, by hand or by approving an application ([F7](#f7-partners), "Becoming a partner").
- **Two doors** (the owner, 2026-11-06): the header and the sign-in page have «ورود مشتری» and «ورود همکار» (`/auth?as=partner`). The customer door works as above. The partner door sends a code only to a partner's number (it asks `partner.isPartnerPhone` first), because a code verified for an unknown number would make a customer account, and one role per number would then shut that person out of partnering; anyone else is pointed to the application.
- Blocked users can't sign in: the Admin blocks and unblocks from the Users page, which signs the user out everywhere at once. She can't block herself or any admin. Blocking a partner closes his sign-in only; his link and commissions are switched off by deactivating him ([F7](#f7-partners)).
- Each user edits their name. Partners also enter their Sheba number, so the Admin knows where to send commissions ([F7](#f7-partners)).
- **Password (optional).** After signing in, a customer or partner can set a password in Profile Settings and then sign in with their number and that password; the code stays, and is also how a forgotten password is fixed (sign in with a code, then set a new one there; the card asks for no "current password"). A password can be set or replaced only within 30 minutes of signing in, and doing so signs the other devices out. It is stored only as a hash. A wrong password, an unknown number and a number that never set one all read the same, 5 wrong passwords in 15 minutes pause password sign-in for that number (the code still works), and password sign-in is rate-limited per IP. While the sign-in code is the public showcase code, this adds convenience, not security.

**Pages:** Login / Register · Profile Settings · Users (user form in a dialog)

---

### F2. Dog Profiles

**Who:** the customer manages their own dogs; the Admin sees and edits all.

**The fields** (the owner's project document, «فیلدهای پرونده», settled on 2026-10-25). Details the customer doesn't fill in, the Admin gets in person and enters herself.

| Group     | Fields                                                                                                                                                                                                 | On the customer's form       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Who it is | name, sex, birth date (or an age, kept as an estimate), **breed type** («خالص / دورگه / میکس») and the breed inputs it asks for, photo                                                                 | required, except the photo   |
| Body      | weight, neutered, height (cm), coat color, markings                                                                                                                                                    | weight and neutered required |
| Health    | vaccinations («کامل / ناقص / نمی‌دانم») with photos of the card and a note in the owner's words; microchip number and its implant date; a photo of the tattoo; medical notes with photos of the papers | optional                     |
| Training  | training goals («خانگی / ورزشی / کاری», several allowed); behavior problems, one per line; a note for the trainer                                                                                      | optional                     |

- **Breed type decides the breed inputs.** A **purebred** has one breed; a **cross** has its two parents' breeds (two different ones); a **mixed** dog (parents unknown) has at most what it looks like. Wherever a breed is shown in one line it reads «مالینویز», «پامرانین × شیتزو» or «میکس، شبیه …». A dog written before the breed type was asked has none («not stated») until the Admin fills it in, and keeps its breed as it is.
- **The new dog form is four steps** (who it is, body, health, training); health and training can be left for later. Editing a dog is one page.
- **Behavior problems** are shown on the Admin's dog page right above the diary ([F14](#f14-dog-file-logbook-and-certificate)).
- **The photos in the file** (vaccination card up to 6, medical papers up to 6, tattoo 1) are uploaded by the owner and seen by the owner and the Admin. Like every image they are served by their unguessable link, with no check of who asks: decided on 2026-10-25 that a dog's papers need no more than that. The Admin can't upload them, the same as the dog's photo.
- **Still open:** other species (T-02, dog-only until the owner decides); a section per vaccine with dates (T-18, needs the owner's list of vaccines); the "GPS" mentioned with the microchip (Q-13); PDFs (photos only, since the image pipeline takes images).

**Locked after the evaluation.** Once a dog is **evaluated** ([F3](#f3-evaluation)), the fields that decide eligibility ([F4](#f4-eligibility)) are **locked for the customer**: the **birth date**, the **breed type** and the **breeds**. Only the Admin can change them from then on. Otherwise a customer could change a birth date to get past an age range. For the early-age exception, a cross counts as a working breed when either parent is one.

**Passed courses.** A dog's profile lists the courses it has **passed**. A course gets there in two ways:

- **Completed on the site:** the Admin marks an enrollment of it done ([F6](#f6-enrollments)).
- **Marked by the Admin**, when she knows the dog already has it, e.g. it was trained before the site existed, or it **passed the course's test** instead of taking it (the Companion cards' «داشتن لول سه یا گذراندن تست لول سه»; the test is held in person, and the app records only that it was passed). She can unmark these too.

Both count the same for prerequisites ([F4](#f4-eligibility)). Only the Admin edits the passed courses; the customer sees them.

**No deleting dogs.** A dog is never deleted, by anyone: its evaluations and enrollments point at it.

A dog's page shows whether it is evaluated, its passed courses, its evaluation requests and its enrollments with their status.

**Pages:** Dashboard (customer: my dogs) · Dog Form · Dog Detail · Dogs (Admin) · Dog Detail (Admin)

---

### F3. Evaluation

**Who:** the customer requests; the Admin records the outcome.

The free first meeting with a dog: an **assessment**, a test of where the dog stands (the owner corrected the earlier «checkup, not a test» wording on 2026-10-19). It has two parts: the owner's, in the request, and the trainer's, at the meeting and in recording the outcome. It involves no money. The owner's questionnaire and the trainer's evaluation form are **not defined yet**: until they are, the request is the dog, the dates and the optional media below, and the outcome is the two buttons.

1. **Request** (the owner's part). The customer picks a dog and gives an **earliest date** and **when they're usually free** (weekdays and time of day: morning, afternoon, evening). They can also attach **photos and videos** of the dog: optional, last on the form, never the main step and never a substitute for the form.
2. **The Admin calls them** and they meet (the trainer's part). The app doesn't record when.
3. **Outcome.** The Admin presses one of two buttons on the request:
   - **«ارزیابی شد»** (evaluated): the dog is now **evaluated** and its courses can be bought.
   - **«رد»** (rejected), with a reason: the dog isn't a fit, or the meeting never happened. The customer can request again.

**Status:** `requested` → `evaluated` or `rejected`; or `withdrawn` by the customer while it's still `requested`. All three are final.

**Evaluated** is not stored separately: a dog is evaluated when any of its evaluations is `evaluated`. That unlocks buying courses ([F4](#f4-eligibility)) and locks the eligibility fields ([F2](#f2-dog-profiles)).

**Edge cases:**

- **Who can request an evaluation:** only a dog with no evaluation, or whose evaluations all ended `rejected` or `withdrawn`. A dog with a `requested` or `evaluated` one can't request another.
- **A dog the Admin already knows** (trained before the site existed): from its profile, she marks it evaluated directly, with no request. It is recorded as an evaluation in `evaluated`.

**Pages:** Evaluation Request · Dashboard (customer: open requests) · Dog Detail · Evaluations (Admin) · Dog Detail (Admin)

---

### F4. Eligibility

**Who:** runs when a customer adds a course to the cart, at checkout, and again when the payment comes back ([F5](#f5-cart-and-checkout)).

One **eligibility check** decides whether a dog may buy a course. It is a single place in the code, so new rules plug into it without touching checkout. Today it checks:

1. The dog is **evaluated** ([F3](#f3-evaluation)).
2. The dog has **passed** every prerequisite course ([F2](#f2-dog-profiles)). A prerequisite that is only bought, or only in the cart, doesn't count: it must be done.
3. The dog's age is inside the course's age range.
4. The dog has no **active** enrollment of the same course.
5. The course isn't archived.

A failed check says **why**, e.g. «اول باید دوره‌ی سگ خونگی را تمام کند» or «حداقل سن این دوره ۶ ماه است». Course Detail shows, for each of the customer's dogs, whether it can take the course and why not.

**The early-age exception (built, switched off).** The owner has described one exception to rule 1: a very young dog that is **not** of a working breed may start one of **three introductory courses** without the evaluation. Its facts are **not confirmed**: the exact age bounds, which three courses and which breeds are working. They are not guessed. `app/lib/early-age-exception.ts` holds `null`, so the exception is **off** and every dog needs the evaluation (it fails closed). Once the owner confirms the facts and they are written there, the same check (so the cart, «پرداخت» and the payment callback together) lets a dog skip **only the evaluation** when all of these hold: the course is one of the named ones; the dog's age in whole months is inside the bounds (inclusive); a breed is written and it matches no working breed (compared with Persian letters, spaces and half-spaces folded, and a half-written working breed is also refused); the dog is otherwise eligible. A dog with no breed written never qualifies: a breed nobody classified is not assumed harmless. Every other rule (prerequisites, the course's own age range, an active enrollment, a course not on sale) still applies.

**Pages:** Course Detail · Buy a Course · Cart · Dog Detail (Admin: why a dog can't take a course)

---

### F5. Cart and Checkout

**Who:** the customer.

**The cart lives in the customer's account** (a `cart_item` table), so it follows them to another device; the browser keeps a copy in local storage so the page shows it at once. It holds items of **one course for one dog**. A customer can add several (two courses for two dogs, say) and pay for them all at once.

**Starting from the dog.** For someone who already knows what they want, «خرید دوره» (a button at the top of the catalogue, also `/buy`) starts the other way round. A visitor is sent to sign in and comes back to the same page, the dog in the address included. It asks **which of the customer's dogs** first (one tap, kept in the address as `?dog=`; a customer with one dog has it chosen already; one with none is asked to introduce a dog and brought back), then lists every course on sale with **the server's verdict for that dog**, the same [F4](#f4-eligibility) check the cart and «پرداخت» use (`checkout.dogCourses`: the caller's own dogs only; another owner's dog, a malformed id and an unknown dog all read as not found). A course the dog can take shows its price and «افزودن به سبد» (or «در سبد است» once it is there); one it can't shows each reason and the way out (the free evaluation, the course to finish first). Nothing here can be bought that the cart would refuse. The place is picked in the cart (step 2), not here. The page offers no bundle, discount or program terms, because no approved facts for them exist yet (`docs/overnight/03-DECISIONS-NEEDED.md`).

1. **Add to cart.** On Course Detail the customer picks one of their dogs and presses «افزودن به سبد». Picking a dog needs signing in. The same course for the same dog can't be in the cart twice.
2. **Cart.** It shows each item with the course's **current price** and its eligibility ([F4](#f4-eligibility)), read fresh from the server; an item that isn't eligible any more is marked and can't be paid for. The total is the sum of the eligible items.
   - **Where it is taught.** An item whose course offers places ([F8](#f8-course-catalogue)) asks «کجا آموزش ببینه؟» with a chip per place, the recommended one tagged «پیشنهادی»; a course with one place just says it, and one with none asks nothing (the place is settled after the evaluation). The pick is saved with the cart item (`cart.setPlace`, only a place the course offers), so it follows the customer to another device. «پرداخت» waits until every payable item has its place, and says how many still need one. **Boarding costs extra, and the extra is never charged in the app:** picking it shows, under the item and under the total, that its cost isn't in the price and the head trainer will call to arrange it and agree on the cost. The price, the deposit and the partner's commission are the course's alone, whatever the place.
3. **When are you free? (optional).** Under the dogs' bags the cart asks «کی هماهنگ کنیم؟»: the weekdays and the parts of the day the customer is usually free, as two lists of chips in the same words as the evaluation request ([F3](#f3-evaluation)). It is a **preference for the call, not a booking**: nothing is reserved and the page says so. It is sent with «پرداخت», kept on the payment (`available_days`, `available_periods`; only the known words, once each, in the order of the week), shown to the Admin beside the customer's name and number on the Payments page and to the customer on their Purchases page. Leaving it empty is fine and changes nothing about what can be bought.
4. **Pay.** «پرداخت» sends the items to the server, which checks each again and reads its price. It saves a **pending payment** listing the items (dog, course, price, place) and sends the amount due now to the gateway: the total, or, if the Admin has set a **deposit** ([F10](#f10-settings)), that share of it.
5. **Result.** The gateway returns the customer to the Cart with a banner showing the result.
   - **Success:** in one database transaction, the payment becomes **paid**, an **enrollment** is created for each item at the price and place saved in step 4, and the partner commission is written when it's due ([F7](#f7-partners)). The cart is emptied. The customer sees «پرداخت انجام شد؛ برای هماهنگی با شما تماس می‌گیریم» (paid; we'll call you), and the Admin gets an SMS ([F9](#f9-notifications)).
   - **Failure or abandoned:** the pending payment becomes **failed**; the cart is unchanged.

Prices are fixed by the course. Discounts and changing a price for one customer are not in this version.

**Refunds.** The money is always sent back **outside the app** (a bank transfer), but the decision is recorded in the app, with its state, amount, transfer reference and who did it. On a **paid** payment the Admin presses «ثبت بازپرداخت»: an amount in Toman (shown and stored as Rial), optionally for one of the payment's courses, and a reason of her own. The refund starts `pending`; once he has sent the money he presses «پرداخت شد» and writes the transfer's **reference** (required), which is kept and sent to the customer in an SMS; a refund decided by mistake is **cancelled** before it is paid. Each refund is answered once and nothing is deleted. **The refunds that stand (pending or paid) can never add up to more than the payment charged** (with a deposit, what was charged, not the full price), checked under a lock on the payment so two refunds made at the same moment can't both fit. Every step writes a line in the **audit trail** (`audit_event`: who, what, when and the few facts worth keeping; the certificates' issue and revocation are written there too). The customer sees each refund on the Purchases page with its amount, state and reference, never the Admin's reason, and never one that was cancelled. A refund does not by itself cancel an enrollment, and the app states no refund policy: what is refunded, and when, is the Admin's decision (`docs/overnight/03-DECISIONS-NEEDED.md`).

**The deposit.** The Admin's setting «پیش‌پرداخت» is the share of the price taken when the customer pays: **100 (the whole price) until the owner approves a deposit** (the owner mentioned 50%). With a deposit set, the cart shows the amount due now as the big number and says «پیش‌پرداخت ٪۵۰ از …؛ … را موقع هماهنگی می‌دهی»; the gateway is charged the deposit **rounded up to the Rial** and no more; each payment item and the enrollment keep the **full price**; the payment records the full price, the amount charged and the percent it was made with, and keeps that percent when the setting changes later. The Purchases page and the Admin's payments say what was taken and what is left. The balance is settled **outside the app**, when the lessons are arranged: the app shows how much is left and does not collect it. A failed deposit payment enrolls nothing, as any failed payment. The partner's commission stays on the price of what was bought, as before (not on the deposit).

**Edge cases:**

- **The gateway calls back twice:** a unique index on the gateway's payment id, and a pending payment that can be settled only once, reject the second one.
- **An item stops being eligible between checkout and the callback** (the same course bought for the same dog in another tab, or the Admin archives the course): the payment is still recorded as paid, but that item gets **no enrollment**. It is flagged on the Admin Dashboard as **paid, not enrolled**, and the Admin gives that money back outside the app and records the refund on the payment (see **Refunds** below).
- **A price changes while the course is in the cart:** the cart always shows the current price; the customer pays what it showed at «پرداخت».
- **The Admin takes a place off a course while it is in a cart:** the pick no longer counts. A course left with one place takes it; otherwise the item asks again, and a «پرداخت» sent with the old pick is refused like any changed item, so the customer reviews the cart.
- **Where a purchase is taught** shows on the customer's Purchases page and on the Admin's Payments and Enrollments pages as a small pill (boarding in gold, with the note about its cost on Purchases), and in the Admin's purchase SMS. Purchases made before places existed show none.
- **Another browser or device:** the cart is the account's, so it is there on any device. It is read again when the tab is used, so what was added elsewhere appears. A cart a browser held from before carts lived in the account is merged in once; after that the account's cart wins, so an item bought or removed elsewhere isn't put back by an out-of-date copy. Signing out empties the browser's copy and keeps the account's.
- **A payment settles:** the items it bought leave the cart, on every device.

**Pages:** Course Detail · Buy a Course · Cart · Purchases

---

### F6. Enrollments

**Who:** created by checkout; the Admin completes or cancels them.

An enrollment is created **only by a successful payment** ([F5](#f5-cart-and-checkout)): the Admin doesn't create, accept or price them. Its price is the one paid and never changes.

| Status      | How it gets there                                                                             |
| ----------- | --------------------------------------------------------------------------------------------- |
| `active`    | Paid for at checkout. The Admin calls the customer to arrange the training.                   |
| `completed` | The Admin presses **«تمام شد»** on it in the Enrollments list and confirms. No note, no form. |
| `cancelled` | The Admin presses **«لغو»** and confirms.                                                     |

`completed` and `cancelled` are final. A completed enrollment makes its course **passed** for the dog ([F2](#f2-dog-profiles)).

**Edge cases:**

- **The Admin can't take the customer** (fully booked, or the dog isn't a fit after all): she cancels the enrollment. Refunds aren't in this version, so the money goes back outside the app and isn't recorded.
- **The course changes in the catalogue after the purchase:** existing enrollments keep the price paid.

**Pages:** Dashboard (customer) · Dog Detail · Enrollments (Admin) · Dog Detail (Admin)

---

### F7. Partners

**Who:** partners bring customers; the Admin manages partners and pays their referral gifts outside the app.

**The words** (the owner, 2026-11-06): what a partner earns is a **referral gift** («هدیه‌ی معرفی») everywhere a person reads it, never «پورسانت» or «کمیسیون». The code and the tables keep `commission`. A gift is earned **only by a paid course purchase**: signing up, an evaluation or a call earn nothing, and a customer who buys no course earns their partner nothing.

**Becoming a partner** (the owner, 2026-11-06). Three ways, all ending in an Admin's approval:

1. The business **applies** on `/join/partner` (the Partner Enquiry page's form): first and last name, mobile number (the one they will sign in with), business name and kind (clinic, groomer, pet shop, kennel, other), city and address, and optionally the marketer who visited them and a note. A number that already has an account, or already has an application waiting, is refused.
2. A **marketer** visits the business and helps them fill in the same form (the marketer's name is recorded on it).
3. The business **calls**, and the Admin either fills the form in for them or creates the account by hand («همکار تازه»).

The Admin sees the applications on the Partners page («درخواست‌ها»): **«تأیید و ساخت حساب»** creates the partner account (the application's name, number and business, a generated link code) and texts the applicant to sign in from «ورود همکار»; **«رد»** asks for a reason, which is texted. Both are final; a rejected business may apply again. Applications are never deleted.

**The terms.** Every partner accepts the partnership terms (`app/lib/partner-terms.ts`, a **draft** until the owner approves its wording) by ticking «قوانین و ضوابط همکاری رو خوندم و قبول دارم»: on the application form, or, for a partner made by hand or after the wording changes (a new `PARTNER_TERMS_VERSION`), on his dashboard, which shows only the terms until he accepts. The acceptance is a `consent` row (`partner-terms`, with the version and time; an approval copies the application's). Until he has accepted the version in force, the server refuses his new customers.

**Attribution.** Partners bring in customers through:

1. a **referral link** with their code,
2. a **QR code** of that link, for their shop,
3. **phone leads:** a customer entered in their dashboard before they sign up: the mobile number **and** the guardian's name, the dog's name, breed and age (all required, the owner, 2026-11-06), so a lead is a real person the partner talked to and not a bank of numbers hoping someone buys. The details are the partner's own words, shown to him and the Admin, never matched against the customer's profile.

- A customer is attributed to **one partner, permanently**, when they register.
- A referral link wins over a phone lead.
- If several partners entered the same phone number, the **earliest** lead wins; the others see it as lost.
- An inactive partner's link and leads don't attribute anyone.
- A partner can't enter a number that already has an account (a lead only matters at registration). He can never edit or delete a lead, so earliest-wins can't be gamed. A lead is `lost` when a link or an earlier partner's lead took the customer; the list then shows no name and nobody else.
- Deactivating a partner is reversible and stops new attributions **and** new commissions, including a first purchase by a customer he already had; written commissions stay payable.
- The Admin creates the account with the partner's name, phone number and an optional link code. The code never changes, because it is printed on the partner's card and QR.

**Commission.** At **every paid purchase** of a customer with an active partner, the app writes one **commission**: a percentage of the total of the enrollments that payment created, rounded down to the Rial. The percent is a **step** read from the partner's **paying customers** (settled 2026-10-25, from the owner's partner notes):

- A partner's paying customers are the distinct customers who have earned them a commission, counted over the **whole partnership**; the count never resets. A customer counts once, with their first commission; a payment that created no enrollment doesn't count them. Any paid purchase qualifies; there is no other condition for now.
- There are always **five steps**, a table in the settings ([F10](#f10-settings)). By default: customers 1 to 3 **10%**, the 4th **12%**, the 5th to the 8th **15%**, the 9th **15%**, the 10th and on **18%** (the notes' «۵ تا ۸» and «۱۰ مشتری»; the 9th shares 15%). For fewer steps the Admin gives neighbouring steps the same percent, and the partners see them as one step (the default reads as four: «۵–۹: ۱۵٪»).
- Each commission is written at the step the partner is on **counting this customer**: a new customer can lift the partner to the next step, a repeat buyer doesn't. From then on, every purchase (by new or old customers) is on the new step.
- A step applies **from the purchase that reaches it**: commissions already written keep their percent, nothing is topped up when the partner climbs, and a change to the steps applies to the next commission.
- The partner sees the steps, their paying-customer count and the percent their next customer earns. The Partner Enquiry page shows the steps.
- «پورسانت ویژه ۱۸٪» in the notes is the top step, not a deal for one partner.
- The Admin pays partners **outside the app**, by bank, and presses **«پرداخت شد»** on each commission. The partner sees each commission as paid or unpaid, both in the commissions list and on the row of the person it came from in Leads and Customers (the amount and the state; never the purchase's price, the course or the dog).
- **The enrollment is cancelled afterwards:** the commission already written stays (the code doesn't void it). The pages no longer promise this to partners; whether a refunded purchase should take its gift back is the owner's to decide.

**Pages:** Partner Dashboard (referral link, QR code, commissions) · Leads and Customers · Partners and Leads (Admin)

---

### F8. Course Catalogue

**Who:** the public browses; the Admin manages the catalogue.

- The catalogue and its course pages sell Zurvann's courses. Course Detail adds «افزودن به سبد» ([F5](#f5-cart-and-checkout)), and the catalogue's header has a «خرید دوره» button that starts the purchase from the dog.
- Only the Admin creates and edits courses. Every course in this version has a **fixed price**, an age range and prerequisites. Its length is its **session count**, shown to customers as a description («حدوداً ۵ جلسه»); the app doesn't track lessons.
- **The course settings were settled on 2026-10-26**, from the owner's course card («حداقل سن، تعداد جلسات، محل آموزش، شرایط آموزش، دستورات»): the ages, the session count, the places, the prerequisites (a test passed instead is the Admin's mark on the dog, [F2](#f2-dog-profiles)) and the commands. They all existed already except the places.
- **Places.** The Admin ticks where a course can be taught: **at the client's place** («منزل»), **at the center** («مرکز»), **outside** («بیرون») and **boarding** («پانسیون»), in that order, and may mark one of the ticked ones **recommended**. None ticked means the place is settled after the evaluation («بعد از ارزیابی»). Course Detail lists the places (the recommended one under them, «پیشنهاد طلا: …») and shows the boarding card only when boarding is offered, without a price: boarding's extra cost is agreed on the phone ([F5](#f5-cart-and-checkout)). Group classes are not a place: they aren't running.
- Archived courses can't be bought, but their active enrollments continue, and a completed one still counts as a prerequisite. Archiving and restoring are reversible switches. A course is never deleted, and its link name (slug) never changes after it is created.
- The Admin sets the catalogue order (up and down on the Courses page), uploads the cover, and picks prerequisites; a prerequisite that would make a cycle is refused. A new course goes on sale at once. A price change applies to later purchases only; existing enrollments keep the price paid (F5).
- Courses without a price (working and sport dogs) are **not in this version**; they are a [future feature](#future-features).

**Pages:** Home · Course Catalogue · Course Detail · Courses (Admin) · Course Form

---

### F9. Notifications

**Who:** sent automatically, by SMS, with an in-app copy. In showcase mode SMS land in the SMS Outbox instead of being sent. The outbox is read-only and paged (it gains a row per sign-in code).

| Event                          | To                                                           |
| ------------------------------ | ------------------------------------------------------------ |
| A new evaluation request       | Admin                                                        |
| Evaluation marked «ارزیابی شد» | Customer: their dog's courses are now open                   |
| Evaluation rejected            | Customer (with the reason)                                   |
| A purchase paid                | Customer (receipt), and the Admin (to call, with the places) |
| An enrollment marked done      | Customer                                                     |
| An enrollment cancelled        | Customer                                                     |
| A commission marked paid       | Partner                                                      |
| A refund marked paid           | Customer (with the transfer's reference)                     |

**Pages:** SMS Outbox · the dashboards

---

### F10. Settings

Stored in the database so the Admin can change them without a release. Each is read on every use, so a change applies at once with no restart; a missing value means its default. A commission already written keeps the percent it was written with. The commission steps are a table: always five steps, the first from customer 1, each later one from a later customer (up to the 1000th), each percent 1 to 50%; the Admin edits them together and saves the table at once. The Admin can set the deposit from 1 to 100%, codes per phone from 1 to 30 and per IP from 5 to 200 (guardrails against a typo). The demo accounts skip the hourly per-phone cap. The code length, its 2-minute validity, 5 wrong tries and the 60-second wait are fixed in code.

| Setting                | Default                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Partner commission     | 10% / 12% from the 4th customer / 15% from the 5th and the 9th / 18% from the 10th |
| Deposit                | 100%                                                                               |
| OTP requests per phone | 5 per hour                                                                         |
| OTP requests per IP    | 20 per hour                                                                        |

**Pages:** Platform Settings

---

### F11. Admin Dashboard

**Who:** the Admin, every time she opens the app.

A plain **overview** of what's going on, not accounting. Each number links to the list behind it, already filtered.

| Block           | Shows                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Waiting for her | Evaluation requests to answer; the latest purchases, to call; items **paid, not enrolled** ([F5](#f5-cart-and-checkout))                                                   |
| Enrollments     | Active, completed, cancelled                                                                                                                                               |
| Money           | Sales this month and in total (what was taken, a deposit counted as the deposit; refunds are recorded on the Payments page, not subtracted here); commissions not yet paid |
| Courses         | Each course: how many bought, active, completed                                                                                                                            |

Money is integer **Rial**. At this scale every number is a simple indexed query; nothing is cached.

**Pages:** Admin Dashboard

---

### F12. Privacy and Safeguards

**Privacy.**

- **Customers** see their own dogs, evaluations, enrollments and payments.
- **Partners** see their own leads, which of their customers registered and bought, and their commissions. Not prices, dogs or other partners.

**Safeguards**, enforced by the database:

| Safeguard                         | How                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Paid prices never change          | Each item's price is saved on the pending payment at checkout and copied onto its enrollment.                                   |
| A payment settles once            | A unique index on the gateway's payment id; a pending payment becomes paid or failed by a conditional update, once.             |
| No double enrollment              | A partial unique index: one **active** enrollment per dog and course. The loser of a race becomes **paid, not enrolled**.       |
| One commission per payment        | A unique index on the payment; the partner's row is locked while their customers are counted, so two can't land on one step.    |
| A refund never exceeds the charge | The sum of the refunds that stand is checked under a lock on the payment.                                                       |
| Statuses only move forward        | Each status change is a conditional update (e.g. evaluate only a `requested` evaluation; complete only an `active` enrollment). |

**Tests** (focused, per the repository's testing rules): eligibility blocking each rule; a duplicate gateway callback rejected; two payments for the same dog and course leaving one enrollment and one flagged item; a commission per paid purchase, at the step the partner's paying customers are on.

**Pages:** Cart · Purchases · Partner Dashboard · Admin Dashboard

---

### F13. Consent and Site Rules

**Who:** every customer. The owner supplies the wording; the app records the acceptance.

A **consent** record says a person accepted version V of a text at a time, and for a consent given per dog, which dog. Withdrawing marks it withdrawn; **rows are never deleted**, so what was agreed, and when, is always on record. A new version of a text means a new acceptance.

**The site rules.** No approved wording exists yet, so nothing is published: `app/lib/site-rules.ts` holds `null`, and with it there is no «قوانین» page (it answers 404), no link to it, no tick and nothing recorded. The wording is a legal decision for the owner, not an engineering one. Once the owner approves it and it is set there with a version:

- the page `/rules` shows it, and the header and footer link to it;
- a new customer ticks it on the name step of sign-up, and the acceptance is stored with the version and the time;
- a customer who hasn't accepted the version in force ticks it on the cart, and **the server refuses to start a payment** until they have (`RULES_NOT_ACCEPTED`);
- the browser never sends the version: the server records the one in force, so nobody accepts text that isn't published, or an old version, by mistake.

The same record serves a dog's public logbook ([F14](#f14-dog-file-logbook-and-certificate)).

**Pages:** Rules (only once published) · Login / Register (the tick) · Cart (the tick)

---

### F14. Dog File, Logbook and Certificate

**Who:** the owner of a dog; the Admin (the head trainer) for every dog. Nobody else.

**The dog's file.** Every dog gets a **file number** the moment it is written: `ZD-` and ten random hexadecimal characters, made by the database, unique, never edited. The dogs that existed before it was added got theirs when the column was. The number is on the dog's **QR code**, which opens `/logbook/<number>`; both the owner's and the Admin's dog pages show the number, the QR code, its link and a PNG to print, and the Admin can search dogs by it.

**What a QR code opens.** The dog's **record is private by default**:

- A signed-in **owner** who opens it is sent on to their own dog's page, the **Admin** to the dog's admin page.
- **Everyone else**, signed in or not, sees one page: «این پرونده خصوصیه». It is the same words, status and shape for a private record, for a number that doesn't exist and for text that isn't a number, so the page can't be used to find out which numbers are real; it never carries the dog's name; it is never cached and never indexed (`Cache-Control: no-store`, `noindex`).
- `/logbook` asks for a number (typed in any case, with or without `ZD-`, in Persian digits) and opens that address. It is an exact lookup, not a search: there is no list of records.

**The logbook (the dog's diary).** After a session the **head trainer**, the only staff account, writes it down on the dog's admin page: the day (Jalali, not in the future), the course it belongs to (one of the dog's own enrollments, or none), what was done and seen, the exercises (one per line; blank and repeated lines are dropped) and a one-line summary. The owner reads it on the dog's page, newest first. Entries are corrected by editing; none is deleted. Only the dog's owner and the Admin can read a diary: another customer gets the same «not found» as for a dog that doesn't exist, and partners have no access at all. Each entry carries a «public» mark (default **off**) for the dog's public record, which cannot exist yet ([see below](#f14-dog-file-logbook-and-certificate)).

**No photos or videos in the diary yet.** Dog and evaluation photos are served to anyone with their unguessable link, and an evaluation video is streamed only after a check of who asks; an image added to a diary would be as public as its link, which is not private. Media waits for the owner's decision on public records and a private route for diary images (`docs/overnight/03-DECISIONS-NEEDED.md`).

**The course certificate.** When the Admin has marked an enrollment **completed** ([F6](#f6-enrollments)), she can **issue its certificate** from the dog's admin page («گواهی‌ها»): one per enrollment, with a public number `ZC-` and ten random hexadecimal characters made by the database. Nothing issues one by itself, and an enrollment that is active or cancelled can't have one. The owner sees it on the dog's page with the link and the QR code that verify it. A certificate is never deleted: if it was issued by mistake the Admin **revokes** it with a reason (his own, kept private); the row stays and nothing can issue it anew. What a certificate says, who signs it and whether it needs anything beyond «completed» are the owner's to define (`docs/overnight/03-DECISIONS-NEEDED.md`); until then there is a record and a check, **no printable certificate design**.

`/certificate/<number>` is public and says only: valid (the course, the day, the head trainer, the number), revoked (the number and when; not the course, not the reason), or not found (the same for a number that isn't any certificate's and for text that isn't a number). It never shows the owner, and the dog's name only if its owner has made the dog's record public, which cannot be done yet. It is never cached, since a cached «valid» would outlive a revocation, and never indexed.

**Making a record public (built, switched off).** The owner of a dog may make its record public, and only the owner; but only after reading and accepting **wording about exactly what that shows**, and no approved wording exists, so `app/lib/public-record.ts` holds `null`: no owner is offered the choice, the API refuses to turn it on (`NOT_PUBLISHED`) and every record stays private. When the wording is set (with a version):

- the owner's dog page shows the wording, a plain list of what a stranger would see and what never shows, a tick, and «پرونده را عمومی کن». The server records the agreement as a `consent` ([F13](#f13-consent-and-site-rules)) for **that dog and that version**, with the time; **taking it back is one press, takes effect at once, and the record of having agreed stays**;
- the trainer's session form offers each entry's «public» mark;
- `/logbook/<number>` then shows, to anyone, the dog's **name, breed and age**, the **courses it finished**, its **valid certificates**, and the entries marked public. It is built field by field and never from a whole row, so it **cannot** contain the owner, a phone number, a payment, the weight, the microchip, notes about behavior or health, a photo, the exact birth date, an entry not marked public, a revoked certificate or an unfinished course;
- a certificate's check shows the dog's name only while its record is public;
- a new version of the wording makes every record private again until its owner agrees to the new one.

**Pages:** Dog Record (`/logbook`, `/logbook/:fileNumber`) · Certificate Check (`/certificate/:number`) · Dog Detail (the file card, the diary, the certificates) · Dog Detail (Admin) (the file card, the diary, the session form, issuing and revoking certificates)

---

### F15. English Version

- Every page except the Admin has an English version under `/en/...`; Persian stays unprefixed and is the base and binding language (the English privacy text says so). The Admin and `/rules` (until its wording is approved) are Persian only; their `/en` addresses redirect to the Persian ones.
- The visitor's language is kept through sign-in, the payment gateway's return and every redirect after them. Sentences from the server (form errors, eligibility reasons, upload refusals) come in the page's language.
- Course text has English columns the Admin fills in the course form; a course without English shows its Persian text.
- English pages use Latin digits, Gregorian dates (typed and shown) and prices as «1,200,000 Toman».
- SMS texts stay Persian, even for a customer who signed in on the English site.
- How it is built: [i18n/english-version-plan.md](i18n/english-version-plan.md); the English voice and terms: [i18n/english-glossary.md](i18n/english-glossary.md).

### Installable App

- The site installs as an app from the browser (a web app manifest; the only way onto an iPhone), and an Android app (a Trusted Web Activity) opens the live site full-screen, shared as a signed APK for now. Neither has features of its own: every deploy updates both. Without network, both show an offline page instead of the browser's error. How it is built: [mobile-app.md](mobile-app.md).

### F16. Blog

**Who:** the Admin writes; everyone reads. Settled with the user on 2026-10-25, from the blog item in the owner's project document; that document's own wording hasn't been checked against this yet.

The head trainer's articles: advice on behavior, training, puppies and care, in her voice. She is the only author, so a post has no author field: the article names her from `app/lib/head-trainer.ts`.

- **Writing.** The Admin writes in a rich-text editor (Lexical, pinned to an exact version): paragraphs, H2 and H3, bold and italic, bullet and numbered lists, quotes, links, images with alt text and a caption, and «سگ می‌گه», a tip the article draws as the mascot's chalk bubble. A paragraph that starts in English runs left to right inside a Persian post. Pasted text keeps only these; a pasted `h1` becomes H2, an unsafe link keeps its words and loses the link.
- **Stored as data, drawn by the site.** The body is the editor's JSON cut down to those blocks (`app/lib/blog-body.ts`); the server stores only what passes that whitelist, writes each image's size from its upload, and never stores an image address. The public page draws the JSON with its own renderer, so no stored HTML ever reaches a page and an editor upgrade can't break a published post.
- **Draft or published.** A draft may be unfinished. Publishing needs a summary of 40 to 300 characters (the card's text and the meta description), a cover image with its alt text, and some text. A published post stays published when edited, so an edit must still pass those. Unpublishing takes it off the site at once; publishing again keeps its first date. **Deleting** is for good, after a confirmation. Publishing, unpublishing and deleting are recorded in the audit trail.
- **Address.** `/blog/<slug>`, Latin words and dashes. Changing the slug of a post that was ever published keeps the old one, which answers with a permanent redirect; no other post can take it.
- **Sections.** A fixed list: رفتار، آموزش، نگهداری و سلامت، توله‌ها (`behavior`, `training`, `care`, `puppy`), a first proposal until the owner gives hers.
- **English.** A post has English text only when all four are written: title, summary, cover alt text and body. Without them it doesn't exist on `/en` (not listed, its English address is a 404, no `hreflang` to it, and the language switch leads to `/en/blog`); half an English post can't be published.
- **Search.** The blog page searches titles, summaries and text however Persian was typed (ی/ي, ک/ك, with or without spaces and نیم‌فاصله): «ادرار هیجانی» finds a post that says «ادرار هيجاني». Nothing found says so.
- **The article** ends with the related course the Admin picked (only while it is on sale) or, without one, the free evaluation.
- **For search engines:** each post has its canonical address, `hreflang` for the languages it exists in, Open Graph with the cover, and schema.org `BlogPosting` and breadcrumbs. The site serves `/sitemap.xml` (public pages, courses on sale, published posts with their languages), `/robots.txt` (keeps the Admin, account, sign-in, purchase pages and the API out) and `/blog/rss.xml` (the newest posts, in Persian).

**Not in this version:** comments, more than one author, scheduled publishing, revision history, view counts, video in posts, pagination of the list.

**Pages:** Blog · Article · Blog Posts (Admin) · Post Form (Admin)

## Pages

Each page and the features on it: **38 pages**. A list and its form or detail are one page wherever the form or detail fits in a **drawer** or **dialog**. Every drawer and dialog still has its own URL (e.g. `?evaluation=123`), so SMS links ([F9](#f9-notifications)) and the back button open it directly.

**Public (14)**

| Page              | Features                                          |
| ----------------- | ------------------------------------------------- |
| Home              | F8, F7 (`?ref=`)                                  |
| Course Catalogue  | F8                                                |
| Course Detail     | F8, F4, F5 (which dogs qualify, «افزودن به سبد»)  |
| Login / Register  | F1, F7                                            |
| Help and FAQ      | — (how buying works: pay first, then we call you) |
| Privacy           | —                                                 |
| About             | —                                                 |
| Contact           | —                                                 |
| Partner Enquiry   | F7                                                |
| Rules             | F13 (a 404 until the owner approves the wording)  |
| Dog Record        | F14 (private unless its owner says otherwise)     |
| Certificate Check | F14 (valid, revoked or not found)                 |
| Blog              | F16 (sections and search)                         |
| Article           | F16                                               |

**Customer (7)**

| Page                                                                                                           | Features   |
| -------------------------------------------------------------------------------------------------------------- | ---------- |
| Dashboard: my dogs, open evaluation requests, my enrollments                                                   | F2, F3, F6 |
| Dog Form                                                                                                       | F2         |
| Dog Detail: evaluated or not, passed courses, evaluations, enrollments                                         | F2, F3, F6 |
| Evaluation Request: dog, photos and videos, earliest date, when I'm free                                       | F3         |
| Buy a Course: pick a dog, then its courses with the server's verdict on each                                   | F5, F4     |
| Cart: items with price and eligibility, optional «کی هماهنگ کنیم؟», «پرداخت», the gateway's result as a banner | F5, F4     |
| Purchases: past payments and the enrollments each one bought                                                   | F5         |

**Shared (1)**

| Page             | Features |
| ---------------- | -------- |
| Profile Settings | F1       |

**Partner (2)**

| Page                                                   | Features |
| ------------------------------------------------------ | -------- |
| Partner Dashboard: referral link, QR code, commissions | F7       |
| Leads and Customers: lead → registered → bought        | F7       |

**Admin (14)**

| Page                                                                                  | Features   |
| ------------------------------------------------------------------------------------- | ---------- |
| Admin Dashboard                                                                       | F11        |
| Evaluations: requests with their photos and videos in a drawer; «ارزیابی شد» / «رد»   | F3         |
| Enrollments: active, completed and cancelled; «تمام شد» and «لغو» on each row         | F6         |
| Payments: every payment and its items, with **paid, not enrolled** items flagged      | F5         |
| Dogs                                                                                  | F2         |
| Dog Detail: edit, passed courses, mark evaluated, eligibility per course              | F2, F3, F4 |
| Users (user form in a dialog)                                                         | F1         |
| Courses                                                                               | F8         |
| Course Form                                                                           | F8         |
| Partners and Leads: partners, their customers, commissions with «پرداخت شد»           | F7         |
| Platform Settings                                                                     | F10        |
| SMS Outbox (showcase)                                                                 | F9         |
| Blog Posts: drafts and published posts; «انتشار» / «لغو انتشار» and «حذف» on each row | F16        |
| Post Form: the editor, cover, section, related course, English, preview               | F16        |

---

## Future Features

Not in this version.

1. **Staff trainers**, with lessons assigned to them, their share of each course, and payouts.
2. **A calendar and lesson tracking**: planning lessons, confirming them with the customer, and showing progress («۳ از ۸ جلسه»).
3. **Cancellations and refunds**: refund policies per course (refunds themselves are recorded now, see F5).
4. **The Admin selling by hand**: enrolling a dog herself, at her own price, for a customer who pays her directly.
5. **Discount codes.**
6. **Notes on a dog** that build up its history, visible to the customer or private to the Admin.
7. **Courses without a price** (working and sport dogs). Until then the home page mentions them and customers contact the Admin to enroll.
8. **Disabling a dog** at the customer's request.
9. **Breed rules and evaluation tags** in [F4](#f4-eligibility), once the owner defines dog profiles and course settings.

**Dropped** from the earlier docs: staff trainers as a role, the calendar, course requests and the Admin accepting them, trainer earnings and payouts, wallets and the money ledger, refund policies, behavior modification requests and plans, course tests, assessment slots, trainers submitting courses for approval, and reviews and comments.

## Impact on What's Built

- **Retired:** the trainer role and its area, assessment slots, behavior requests and plans, wallets, transactions and their zero-sum trigger, discount codes, training sessions, refund policies, and the share and refund math in `app/lib/business-rules.ts`.
- **Done** in the backend refactor: everything under _Retired_ is gone from the schema, the API and the demo seed, and the retired and Rebuild route slices were deleted or turned into placeholder notices ([legacy-pages.md](legacy-pages.md)). The API is in `app/orpc/` by feature: `evaluation`, `checkout` (eligibility, cart review, pay, the gateway callback, payments), `enrollment`, `commission`, `dog` and `course`, each with an `admin` part for the Admin.
- **Kept and adapted:** sign-in, dogs, media (request videos move to evaluations), the catalogue and storefront, the showcase payment gateway, orders and order items (they become the pending payment and its items), referral attribution, the SMS Outbox.
- Code comments that cite the deleted phase-one docs (`app-phase-one.md`, `business-logic.md`, `foundations-plan.md` and the design briefs) are updated as that code is refactored.

## Open Questions

1. **Dog profile and course settings:** pending the owner ([F2](#f2-dog-profiles), [F8](#f8-course-catalogue)).
