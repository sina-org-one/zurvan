import { useAtomValue } from "jotai";

import { useHydrated } from "~/hooks/use-hydrated";
import { cartCountAtom } from "~/atoms/cart";
import {
  ACCOUNT_NAV_ITEMS,
  PARTNER_NAV_ITEMS,
  REFERRAL_NAV_ITEM,
  type DeskNavItem,
} from "~/routes/layout_account/account-nav";
import { CART_PATH } from "~/orpc/checkout/constants";

/*===== Account Nav Items =====*/
/**
 * The account sections with the Cart tab's count. The cart lives in localStorage, so the count appears only once the
 * page has hydrated: the server and the hydration pass render without it and the two match. Nothing shows for 0.
 */
export function useAccountNavItems(role: "customer" | "partner"): readonly DeskNavItem[] {
  const hydrated = useHydrated();
  const count = useAtomValue(cartCountAtom);

  // A partner's desk is his two sections and then a customer's (he can be one too); a customer's adds the referral page.
  const items = role === "partner" ? PARTNER_NAV_ITEMS : [...ACCOUNT_NAV_ITEMS, REFERRAL_NAV_ITEM];
  if (!hydrated || count === 0) return items;
  // Spread while rendering, so the labels' getters are read in the page's language.
  return items.map((item) => (item.to === CART_PATH ? { ...item, badge: count } : item));
}
