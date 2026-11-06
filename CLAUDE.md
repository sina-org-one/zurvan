# Repository Instructions

These instructions apply to the entire repository unless overridden by a more specific `AGENTS.md` in a subdirectory.

This is a TanStack Start v1 application (TanStack Router, TanStack Query, oRPC; served by Nitro). The application's user-facing content is in Persian, and every page except the Admin also has an English version under `/en` (Paraglide JS; see [docs/i18n/english-version-plan.md](docs/i18n/english-version-plan.md)). The move from React Router v8 is described in `docs/tanstack-start/`.

## Naming

- The brand is **زروان** in Persian text and **Zurvann** (double "n") in Latin script; use these in user-facing text and docs. The owner settled it on 2026-10-23: page titles, copy and SMS texts say زروان, the English site (`/en`, see [docs/i18n/english-version-plan.md](docs/i18n/english-version-plan.md)) says Zurvann. The old name «آموزش K9» / "K9 Training" is retired; «K9» stays only on the gold emblem and the dog tag (`font-stencil`).
- The header and footer show «زروان» with the descriptor «مجموعه تربیتی و رفتارشناسی سگ زروان» and the gold emblem at its size (the owner, 2026-10-18); `BrandLogo` and the footer do that.
- Internal identifiers use `zurvan` (the npm package, the Docker Compose project and database name, the theme storage key, the GitHub repo) and `zurvann` (the media bucket). Leave them as they are; renaming the database, Compose project or bucket would lose existing data.

## Product Scope

- [docs/app-spec.md](docs/app-spec.md) is the source of truth for how the app works, organized by feature (F1–F12). Code comments that cite the deleted phase-one docs (`app-phase-one.md`, `business-logic.md`, `foundations-plan.md`, the design briefs) are out of date; follow app-spec. [docs/zurvan-courses.md](docs/zurvan-courses.md) is still the source for the courses' content.
- This is a dog-training center, not a multi-service pet marketplace. Since 2026-11-06 Zurvann is a part of a larger services platform (not named on the site yet), and the site sells **the center, زروان**, not one person: copy speaks as «زروان» / «ما» / «مربی زروان», in the same cute, playful voice. The center may have more than one trainer (`TRAINERS` in `app/lib/head-trainer.ts`, Tala Rasti first, as head trainer); never write as if one named trainer does everything. There are no trainer accounts in the app; the owner is the one Admin.
- Partners earn a **referral gift** («هدیه‌ی معرفی»), never «پورسانت» / «کمیسیون» in what people read, and only from a paid course purchase. Partners apply on `/join/partner` (or by phone or through a marketer) and the Admin approves; every partner accepts the partnership terms; a customer a partner enters needs the guardian's name and the dog's name, breed and age (app-spec F7).
- Training is mostly private, like hiring a tutor, and since 2026-10-18 the owner lists four formats: private at the client's place, private at the center, group at the center, and boarding with training (boarding needs prior coordination: for now it is arranged with a partner pension). Group classes aren't running yet, so don't build seats, class minimums or a sign-up for them and never word them as open; the help page says only that the group format starts when a class is held.
- It is a small shop whose items are locked: a new dog starts with a free evaluation (the customer requests it; the Admin marks it evaluated or rejects it). An evaluated dog can buy courses whose prerequisites it has passed, at the course's fixed price, paid upfront from a cart kept in the account (mirrored in the browser). The Admin then calls the customer, and marks the enrollment done when the training is over, which unlocks the next courses.
- The app records and shows; it doesn't run the business. Lesson times and sessions are handled by the Admin in real life: no calendar, lesson tracking, course requests to accept, trainer earnings or payouts. Refunds the Admin decides are recorded in a ledger with an audit trail (the money itself moves outside the app); there are no refund policies. Admin screens are plain lists with one-click buttons and an overview dashboard. Behavior requests, course tests, assessment slots and trainer-submitted courses are dropped.
- Course settings were settled on 2026-10-26 from the owner's course card (app-spec F8): ages, session count (a course's length), places (ticked by the Admin, one picked by the customer in the cart; boarding's extra cost is agreed on the phone, never charged), prerequisites (a test passed instead is the Admin's passed mark on the dog) and commands. The dog profile's fields were settled on 2026-10-25 (app-spec F2); what is still open there is listed in F2.
- The owner's "every dog takes CGC / almost every dog takes BMC" is never said on the site.
- The trainers' details live in `app/lib/head-trainer.ts`; since 2026-10-19 the name, experience and photos there are the owner's own (from the business card and the photos sent that day). Which photo is the chosen introduction photo is still open (`docs/overnight/03-DECISIONS-NEEDED.md`).

## Design and Legacy Pages

- [docs/storefront-design.md](docs/storefront-design.md) is the look and voice of the whole site: a near-black grained paper and bright gold, and a cartoon Belgian Malinois mascot who talks to the visitor in chalk speech bubbles (its "Mascot" section has how a page gets him). The home page is its reference. Only the home page is built in this look so far; its tokens are app-wide.
- **Before changing any page or shared component, check [docs/legacy-pages.md](docs/legacy-pages.md).** If it's listed, follow its verdict: **Redesign** (a small fix goes in as is; a layout change means redesigning the whole page first), **Rebuild** (build the app-spec page new, don't patch the old one), or **Retire** (the feature is dropped: don't build on it, tell the user). Update the doc in the same commit when a row is done.

## Working Directory

- Run project commands from the repository root.
- After making code changes, run `npm run lint` and fix all errors.
- Put temporary scripts, diagnostics, experiments, and logs in `./.tmp-claude/`.
- Create `./.tmp-claude/` as needed. It is gitignored and must never contain deliverable source files.

## Git

- Commit directly on `main`. Do not create, switch to, or merge other branches unless the user explicitly asks for a branch.

## Testing and Validation

- Keep automated tests small and focused on consequential business behavior, security boundaries, and meaningful regressions. Do not add exhaustive input matrices, implementation-detail assertions, library behavior tests, logging/timing checks, or tests for routine styling changes.
- After code changes, run `npm run lint`. Run only existing tests directly relevant to the change; do not run the entire suite for every task. Browser smoke tests are optional and appropriate when changing their covered form flows or when explicitly requested.
- Run `npm run typecheck` for TypeScript contract changes and `npm run build` for bundling or runtime concerns. Avoid repeating checks already performed, including the production build run by Playwright.
- If test prerequisites are unavailable, report the limitation. Do not automatically provision databases or push schemas just to run tests.
- Story files are maintained UI documentation. Preserve them during test cleanup, including their existing `play` functions, controls, and callback actions. Keep Storybook for manual previews and accessibility review; do not reintroduce its automatic test runner.

## Route Module Slices

- **Keep Route Slices Flat:** In this repository, route module directories under `app/routes/` (or the configured `appDirectory`) must be flat. URL hierarchy does not imply folder nesting (e.g. use `dashboard_user/`, never `dashboard/user/`).
- **Declare Routes in Code:** Routes are declared in `app/routes.ts` (TanStack virtual file routes) over the slices; the plugin generates `app/routeTree.gen.ts` (committed, never edited by hand). One module serving two URLs gets a thin route file per URL next to it (e.g. `account_dog_form/account-dog-new.tsx` and `account-dog-edit.tsx`).
- **Colocate Route Internals:** A route module file, its `Route` (`createFileRoute` with `beforeLoad`, `validateSearch`, `loaderDeps`, `loader`, `head`, `headers`, `staticData`, `component`, `errorComponent`, `notFoundComponent`, or `server.handlers` for a server route), and route-only internals (components, hooks, query options, schemas, search params) must live inside that route's slice. Loaders run on the server and in the browser, so a route module never imports a `*.server.*` module at runtime; server-only work belongs in oRPC procedures. See [docs/frontend-guideline.md](docs/frontend-guideline.md).
- **Promote Only When Shared:** Keep code with its immediate route consumer. Only move it to a shared or broader domain location when multiple routes consume it or it clearly belongs to a broader domain abstraction.

```text
app/routes/
  dashboard/
  dashboard_user/
  dashboard_user_setting/
    dashboard-user-setting.tsx  # route module
    components/
    hooks/
    queries.ts
    schema.ts
```

## Code Conventions

Preserve established local conventions unless a rule below explicitly says otherwise.

### User-Facing Text

Never write user-facing text inline. Every string a page shows is a message in `messages/<slice>/fa.json` and `en.json` (`m.<slice>_…()`), written in Persian first, with the English in the voice and terms of [docs/i18n/english-glossary.md](docs/i18n/english-glossary.md). The Admin (`admin_*` slices) and SMS texts stay Persian only. How to add a string is in [docs/frontend-guideline.md](docs/frontend-guideline.md).

### Imports

Import values and types directly from their owning modules. Do not create directory barrel files such as `index.ts`.

### Function Parameters

Prefer a single object parameter when a function has multiple meaningful inputs. Use positional parameters when there is only one input or the ordering is conventional and obvious.

### Section Dividers

Use major dividers between top-level sections to improve code navigation and readability:

```ts
/*===== Section Name =====*/
```

Inside JSX:

```tsx
{
  /*===== Section Name =====*/
}
```

Use minor dividers for distinct phases inside longer functions or JSX:

```ts
/*------ Step Name ------*/
```

```tsx
{
  /*------ SubSection Name ------*/
}
```

Use dividers generously.

### Comments

Comment non-obvious decisions, constraints, edge cases, invariants, and domain-specific reasoning. Prefer explaining **why** over restating what the code already says.

Avoid comments for self-explanatory code.

### Documentation

Add JSDoc to functions, methods, and classes when their purpose, contract, side effects, constraints, or error behavior are not obvious from the code.

Document relevant parameters, return behavior, thrown errors, side effects, and important invariants. Avoid redundant documentation.

### Agent Skills

don't use any Agent Skills until i specifically tell you.

Exception: use the `frontend-design` skill (`.agents/skills/frontend-design/`) whenever you design a page or reshape an existing page's UI.
