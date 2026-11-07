import { base } from "~/orpc/implementer.server";
import {
  adminGetEvaluation,
  adminListEvaluations,
  evaluateRequest,
  listMyEvaluations,
  markDogEvaluated,
  rejectRequest,
  requestEvaluation,
  withdrawEvaluation,
} from "~/orpc/evaluation/service";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";

// The customer's procedures are scoped to the signed-in customer's own dogs; `admin` ones are for the Admin.

const noData = { errors: [], fields: {} };

/*===== Request =====*/
export const requestEvaluationProcedure = base.evaluation.request
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await requestEvaluation({ db: context.db, customerId: context.user.id, input });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }
    if (result.kind === "not-requestable") {
      throw errors.NOT_REQUESTABLE({ data: { errors: result.errors, fields: {} } });
    }

    return result.evaluation;
  });

/*===== Withdraw =====*/
export const withdrawEvaluationProcedure = base.evaluation.withdraw
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await withdrawEvaluation({ db: context.db, customerId: context.user.id, id: input.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-withdrawable") {
      throw errors.NOT_WITHDRAWABLE({ data: { errors: result.errors, fields: {} } });
    }

    return result.evaluation;
  });

/*===== List =====*/
export const listMyEvaluationsProcedure = base.evaluation.listMine
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) =>
    listMyEvaluations({ db: context.db, customerId: context.user.id, dogId: input.dogId }),
  );

/*===== Admin =====*/
export const adminListEvaluationsProcedure = base.evaluation.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context, input }) => adminListEvaluations({ db: context.db, status: input.status, dogId: input.dogId }));

export const adminGetEvaluationProcedure = base.evaluation.admin.get
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminGetEvaluation({ db: context.db, id: input.id });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    return result.evaluation;
  });

export const adminEvaluateProcedure = base.evaluation.admin.evaluate
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await evaluateRequest({ db: context.db, id: input.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-answerable") {
      throw errors.NOT_ANSWERABLE({ data: { errors: result.errors, fields: {} } });
    }
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.evaluation;
  });

export const adminRejectProcedure = base.evaluation.admin.reject
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await rejectRequest({ db: context.db, id: input.id, input: { reason: input.reason } });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-answerable") {
      throw errors.NOT_ANSWERABLE({ data: { errors: result.errors, fields: {} } });
    }
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.evaluation;
  });

export const adminMarkEvaluatedProcedure = base.evaluation.admin.markEvaluated
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await markDogEvaluated({ db: context.db, dogId: input.dogId });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: noData });
    if (result.kind === "not-answerable") {
      throw errors.NOT_ANSWERABLE({ data: { errors: result.errors, fields: {} } });
    }
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.evaluation;
  });
