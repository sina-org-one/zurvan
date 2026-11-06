import { UserRound } from "lucide-react";

import { cn } from "cn";

import { BrandEmblem } from "~/components/brand-emblem";
import { EvaluationButton } from "~/components/evaluation-button";
import { Link } from "~/components/link";
import { NavLink } from "~/components/nav-link";
import { CENTER } from "~/lib/contact";
import { HeaderSearchBar, HeaderSearchToggle, useHeaderSearch } from "~/routes/layout_public/components/header-search";
import { LanguageSwitch } from "~/components/language-switch";
import { ViewerControls } from "~/routes/layout_public/components/viewer-controls";
import { NAV_CTA, NAV_ITEMS } from "~/routes/layout_public/nav-items";
import type { Viewer } from "~/routes/layout_public/viewer";
import { m } from "~/paraglide/messages";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const NAV_LINK = cn(
  "rounded px-1 py-1 text-[15px] text-foreground/85 decoration-primary decoration-2 underline-offset-8 hover:text-foreground hover:underline aria-[current=page]:text-foreground aria-[current=page]:underline",
  FOCUS,
);

/*===== Site Header =====*/
/**
 * The storefront header, sitting on the page's paper over a hairline. From `lg`: the wordmark, the four page links,
 * then the other language's name (`LanguageSwitch`), the course search (`useHeaderSearch`), «ورود» (or the signed-in
 * person's cart and menu) and the gold «ارزیابی رایگان» pill. Below `lg` it is only an
 * app bar, the wordmark, the course search and the account: the nav moves to the tab bar at the bottom of the screen, where a thumb
 * reaches it (`TabBar`). A signed-in `viewer` gets their cart and person menu on both (`ViewerControls`).
 */
export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const search = useHeaderSearch();

  return (
    <header className="relative z-30 mx-auto w-full max-w-6xl px-4 pt-3 md:px-8">
      <div className="flex items-center justify-between gap-4 border-b border-foreground/25 pb-3">
        {/*------ Wordmark ------*/}
        <Link
          to="/"
          aria-label={m.layout_public_home_link_label()}
          className={cn("flex items-center gap-2.5 rounded", FOCUS)}
        >
          <BrandEmblem className="size-12" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-3xl font-black text-foreground">{CENTER.name}</span>
            {/* Dropped on the narrowest phones, where it would crowd the account controls. */}
            <span className="hidden text-[11px] text-foreground/65 min-[380px]:block">{CENTER.descriptor}</span>
          </span>
        </Link>

        {/*------ Desktop nav ------*/}
        <nav aria-label={m.layout_public_main_menu()} className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={NAV_LINK}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/*------ Account and the ask ------*/}
        <div className="flex items-center gap-3">
          {/* Desktop only: the phone's app bar has no room; there it is in the «بیشتر» sheet and the footer. */}
          <LanguageSwitch className={cn(NAV_LINK, "hidden lg:inline-flex")} />
          <HeaderSearchToggle search={search} />
          {viewer ? (
            <ViewerControls viewer={viewer} />
          ) : (
            <>
              {/* Two doors on desktop: customers sign in or up; partners sign in with an approved partner's number. The
                  phone's account button opens the same page, whose switch has both. */}
              <Link to="/auth" className={cn(NAV_LINK, "hidden lg:block")}>
                {m.layout_public_sign_in()}
              </Link>
              <Link to="/auth" search={{ as: "partner" }} className={cn(NAV_LINK, "hidden lg:block")}>
                {m.layout_public_sign_in_partner()}
              </Link>
              {/* The app bar's account button. */}
              <Link
                to="/auth"
                aria-label={m.layout_public_sign_in_or_up()}
                className={cn(
                  "grid size-11 place-items-center rounded-full border border-foreground/25 text-foreground lg:hidden",
                  FOCUS,
                )}
              >
                <UserRound aria-hidden className="size-5" strokeWidth={1.8} />
              </Link>
            </>
          )}
          <EvaluationButton className="hidden px-5 py-2 text-sm lg:inline-flex">{NAV_CTA.label}</EvaluationButton>
        </div>
      </div>

      {/*------ Search ------*/}
      <HeaderSearchBar search={search} />
    </header>
  );
}
