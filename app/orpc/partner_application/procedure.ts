import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";
import {
  adminListApplications,
  applyForPartnership,
  approveApplication,
  rejectApplication,
} from "~/orpc/partner_application/service";

/*===== Constants =====*/
const noData = { errors: [], fields: {} };
// Persian only: the Admin's.
const ALREADY_ANSWERED_MESSAGE = "این درخواست قبلاً جواب داده شده.";

/*===== Apply =====*/
// Public: the form on `/join/partner` is for people who have no account yet.
export const applyProcedure = base.partnerApplication.apply
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await applyForPartnership({ db: context.db, input });

    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }
    return { id: result.id };
  });

/*===== Admin =====*/
export const adminListApplicationsProcedure = base.partnerApplication.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context }) => adminListApplications({ db: context.db }));

export const adminApproveApplicationProcedure = base.partnerApplication.admin.approve
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await approveApplication({ db: context.db, id: input.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-answerable") {
      throw errors.NOT_ANSWERABLE({ data: { errors: [ALREADY_ANSWERED_MESSAGE], fields: {} } });
    }
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }
    return result.application;
  });

export const adminRejectApplicationProcedure = base.partnerApplication.admin.reject
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await rejectApplication({ db: context.db, id: input.id, reason: input.reason });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-answerable") {
      throw errors.NOT_ANSWERABLE({ data: { errors: [ALREADY_ANSWERED_MESSAGE], fields: {} } });
    }
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }
    return result.application;
  });
