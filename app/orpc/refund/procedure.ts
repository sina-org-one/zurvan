import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";
import {
  adminCancelRefund,
  adminCreateRefund,
  adminListRefunds,
  adminMarkRefundPaid,
  listMyRefunds,
} from "~/orpc/refund/service";

/*===== Customer =====*/
// The customer's refunds are scoped to the signed-in customer's own payments.
export const listMyRefundsProcedure = base.refund.listMine
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context }) => listMyRefunds({ db: context.db, customerId: context.user.id }));

/*===== Admin =====*/
export const adminListRefundsProcedure = base.refund.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) =>
    adminListRefunds({ db: context.db, ...(input.paymentId === undefined ? {} : { paymentId: input.paymentId }) }),
  );

export const adminCreateRefundProcedure = base.refund.admin.create
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminCreateRefund({ db: context.db, adminId: context.user.id, input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "not-paid") {
      throw errors.NOT_PAID({ data: { errors: ["فقط برای پرداخت موفق می‌شود بازپرداخت ثبت کرد."], fields: {} } });
    }
    if (result.kind === "invalid")
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    return result.refund;
  });

export const adminMarkRefundPaidProcedure = base.refund.admin.markPaid
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminMarkRefundPaid({
      db: context.db,
      adminId: context.user.id,
      id: input.id,
      reference: input.reference,
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "not-pending") {
      throw errors.NOT_PENDING({ data: { errors: ["این بازپرداخت قبلاً جواب داده شده."], fields: {} } });
    }
    if (result.kind === "invalid")
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    return result.refund;
  });

export const adminCancelRefundProcedure = base.refund.admin.cancel
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminCancelRefund({ db: context.db, adminId: context.user.id, id: input.id });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "not-pending") {
      throw errors.NOT_PENDING({ data: { errors: ["این بازپرداخت قبلاً جواب داده شده."], fields: {} } });
    }
    if (result.kind === "invalid")
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    return result.refund;
  });
