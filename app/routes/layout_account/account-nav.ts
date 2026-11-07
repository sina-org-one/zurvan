import { BookOpen, Gift, PawPrint, ReceiptText, ShoppingBag, Store, UsersRound, type LucideIcon } from "lucide-react";

import { ACCOUNT_LINKS } from "~/lib/account-links";
import { CART_PATH, PURCHASES_PATH } from "~/orpc/checkout/constants";
import type { StaticRoutePath } from "~/lib/route-path";
import { m } from "~/paraglide/messages";

/*===== Account Navigation =====*/
// The account area's sections, shared by the desktop nav and the phone tab bar. Only built pages are listed; add each
// one here when its page exists (docs/storefront-design.md, "Account Shell"). Both roles get the tab bar on
// phones, so the person menu no longer lists the sections.

/** A page without params: what the header, the tab bar and the footer can link to. */
export type DeskPath = StaticRoutePath;

/** One section in a desk's header and tab bar. */
export type DeskNavItem = {
  label: string;
  /** A shorter name for the tab bar, where the label would crowd its neighbours. */
  short?: string;
  to: DeskPath;
  icon: LucideIcon;
  /** Active only on this exact URL: a desk's landing page would otherwise stay underlined on every page below it. */
  end?: boolean;
  /** A count shown beside the label, e.g. the cart's items. Nothing shows for 0. */
  badge?: number;
};

/** The link at the end of the header and the last tab: back out of the desk into the store. */
export type DeskExitLink = { label: string; to: DeskPath; icon: LucideIcon };

// The customer's pages (Dashboard, Cart, Purchases) come from the shared list, so the storefront's person menu and
// this shell always name and order them the same; the icons are the shell's own. The Cart's count is added at render
// time by `useAccountNavItems`: it comes from the browser-only cart, so it can't be part of this static list.
// Labels are getters over the messages, read while rendering in the page's language: a spread (`...link`) or a plain
// value would freeze the language the module was first loaded in.
const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  "/account": PawPrint,
  [CART_PATH]: ShoppingBag,
  [PURCHASES_PATH]: ReceiptText,
};

export const ACCOUNT_NAV_ITEMS: readonly DeskNavItem[] = ACCOUNT_LINKS.map((link) => ({
  get label() {
    return link.label;
  },
  to: link.to,
  ...("end" in link ? { end: link.end } : {}),
  icon: ACCOUNT_ICONS[link.to] ?? PawPrint,
}));

/**
 * A customer's referral page (F7, the owner 2026-11-07: customers earn referral gifts the same way partners do). The
 * same page as the partner's dashboard; its customers list is reached from there. Not `end`, so the tab stays lit on it.
 */
export const REFERRAL_NAV_ITEM: DeskNavItem = {
  get label() {
    return m.layout_account_nav_referral();
  },
  get short() {
    return m.layout_account_nav_referral_short();
  },
  to: "/account/partner",
  icon: Gift,
};

/** The partner's pages (F7): the dashboard and the leads. A partner is a customer too, so his desk adds theirs. */
export const PARTNER_ONLY_NAV_ITEMS: readonly DeskNavItem[] = [
  {
    get label() {
      return m.layout_account_nav_partner_home();
    },
    get short() {
      return m.layout_account_nav_partner_home_short();
    },
    to: "/account/partner",
    end: true,
    icon: Store,
  },
  {
    get label() {
      return m.layout_account_nav_partner_leads();
    },
    get short() {
      return m.layout_account_nav_partner_leads_short();
    },
    to: "/account/partner/leads",
    icon: UsersRound,
  },
];

export const PARTNER_NAV_ITEMS: readonly DeskNavItem[] = [...PARTNER_ONLY_NAV_ITEMS, ...ACCOUNT_NAV_ITEMS];

export const ACCOUNT_EXIT_LINK: DeskExitLink = {
  get label() {
    return m.layout_account_nav_exit();
  },
  to: "/courses",
  icon: BookOpen,
};

/** The room's name, the chip after the wordmark. */
export function roomLabel(role: "customer" | "partner"): string {
  return role === "partner" ? m.layout_account_room_partner() : m.layout_account_room_customer();
}
