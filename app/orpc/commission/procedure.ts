import { adminListCommissions, listPartnerCommissions, markPaid } from "~/orpc/commission/service";
import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";

/*===== Partner =====*/
export const listMyCommissionsProcedure = base.commission.listMine
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context }) => listPartnerCommissions({ db: context.db, partnerId: context.user.id }));

/*===== Admin =====*/
export const adminListCommissionsProcedure = base.commission.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) => adminListCommissions({ db: context.db, paid: input.paid }));

export const adminMarkCommissionPaidProcedure = base.commission.admin.markPaid
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await markPaid({ db: context.db, id: input.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "already-paid") throw errors.ALREADY_PAID({ data: { errors: result.errors, fields: {} } });

    return result.commission;
  });
