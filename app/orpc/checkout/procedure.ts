import { env } from "~/env.server";
import { getPaymentGateway } from "~/lib/payment-gateway.server";
import { resolvePublicOrigin } from "~/lib/public-origin";
import { PAYMENT_LOCALE_PARAM } from "~/orpc/checkout/constants";
import {
  adminGetDogEligibility,
  adminListPayments,
  getDogEligibility,
  getMyDogCourses,
  listMyPayments,
  payCart,
  reviewCart,
} from "~/orpc/checkout/service";
import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";
import { baseLocale, type Locale } from "~/paraglide/runtime";

// The customer's procedures are scoped to the signed-in customer's own dogs and payments; `admin` ones are for the
// Admin.

/*===== Dog Eligibility =====*/
export const dogEligibilityProcedure = base.checkout.eligibility
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await getDogEligibility({
      db: context.db,
      customerId: context.user.id,
      courseSlug: input.courseSlug,
      locale: context.locale,
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    return result.dogs;
  });

/*===== Courses For A Dog =====*/
export const myDogCoursesProcedure = base.checkout.dogCourses
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await getMyDogCourses({
      db: context.db,
      customerId: context.user.id,
      dogId: input.dogId,
      locale: context.locale,
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    return result.courses;
  });

/*===== Review =====*/
export const reviewCartProcedure = base.checkout.review
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) => reviewCart({ db: context.db, customerId: context.user.id, input }));

/*===== Pay =====*/
export const payCartProcedure = base.checkout.pay
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await payCart({
      db: context.db,
      gateway: getPaymentGateway(),
      customerId: context.user.id,
      input,
      callbackUrl: paymentCallbackUrl({
        origin: resolvePublicOrigin(context.headers, env.BETTER_AUTH_URL, env.HTTP_IP),
        locale: context.locale,
      }),
    });

    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }
    if (result.kind === "not-eligible") {
      throw errors.NOT_ELIGIBLE({ data: { errors: result.errors, fields: {} } });
    }
    if (result.kind === "rules-not-accepted") {
      throw errors.RULES_NOT_ACCEPTED({ data: { errors: [], fields: {} } });
    }

    return { url: result.url };
  });

/*===== Payments =====*/
export const listMyPaymentsProcedure = base.checkout.payments
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context }) => listMyPayments({ db: context.db, customerId: context.user.id }));

/*===== Admin =====*/
export const adminListPaymentsProcedure = base.checkout.admin.payments
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) => adminListPayments({ db: context.db, status: input.status }));

export const adminDogEligibilityProcedure = base.checkout.admin.dogEligibility
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminGetDogEligibility({ db: context.db, dogId: input.dogId });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    return result.courses;
  });

/*===== Callback URL =====*/
/**
 * Where the gateway sends the customer back. The callback's own address has no language, so an English customer's
 * carries `?lang=en` and lands on the English cart (`payment_callback`); the gateway adds its own parameters beside it.
 */
function paymentCallbackUrl({ origin, locale }: { origin: string; locale: Locale }): string {
  const url = new URL("/payment/callback", origin);
  if (locale !== baseLocale) url.searchParams.set(PAYMENT_LOCALE_PARAM, locale);
  return url.href;
}
