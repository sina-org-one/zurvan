import { addToCart, clearCart, getCart, mergeIntoCart, removeFromCart, setCartPlace } from "~/orpc/cart/service";
import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";

// A customer's own cart, nobody else's: every query is scoped to the signed-in customer.

/*===== Get =====*/
export const getCartProcedure = base.cart.get
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context }) => getCart({ db: context.db, userId: context.user.id }));

/*===== Add =====*/
export const addToCartProcedure = base.cart.add
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await addToCart({ db: context.db, userId: context.user.id, item: input.item });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: {} } });
    return result.cart;
  });

/*===== Remove =====*/
export const removeFromCartProcedure = base.cart.remove
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) => removeFromCart({ db: context.db, userId: context.user.id, item: input.item }));

/*===== Clear =====*/
export const clearCartProcedure = base.cart.clear
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context }) => clearCart({ db: context.db, userId: context.user.id }));

/*===== Merge =====*/
export const mergeCartProcedure = base.cart.merge
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) => mergeIntoCart({ db: context.db, userId: context.user.id, items: input.items }));

/*===== Place =====*/
export const setCartPlaceProcedure = base.cart.setPlace
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await setCartPlace({
      db: context.db,
      userId: context.user.id,
      item: input.item,
      place: input.place,
    });
    if (result.kind === "invalid") throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: {} } });
    return result.cart;
  });
