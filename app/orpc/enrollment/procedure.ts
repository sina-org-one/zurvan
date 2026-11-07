import { adminListEnrollments, finishEnrollment, listMyEnrollments } from "~/orpc/enrollment/service";
import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";

const noData = { errors: [], fields: {} };

/*===== List =====*/
export const listMyEnrollmentsProcedure = base.enrollment.listMine
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) =>
    listMyEnrollments({ db: context.db, customerId: context.user.id, dogId: input.dogId }),
  );

/*===== Admin =====*/
export const adminListEnrollmentsProcedure = base.enrollment.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) => adminListEnrollments({ db: context.db, status: input.status, dogId: input.dogId }));

export const adminCompleteEnrollmentProcedure = base.enrollment.admin.complete
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await finishEnrollment({ db: context.db, id: input.id, status: "completed" });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-active") throw errors.NOT_ACTIVE({ data: { errors: result.errors, fields: {} } });

    return result.enrollment;
  });

export const adminCancelEnrollmentProcedure = base.enrollment.admin.cancel
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await finishEnrollment({ db: context.db, id: input.id, status: "cancelled" });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-active") throw errors.NOT_ACTIVE({ data: { errors: result.errors, fields: {} } });

    return result.enrollment;
  });
