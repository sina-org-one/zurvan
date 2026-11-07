import { buildDogFileCard } from "~/lib/dog-file.server";
import {
  adminGetDog,
  adminListDogs,
  adminSetPassedCourse,
  adminUpdateDog,
  createDog,
  getDog,
  listDogs,
  updateDog,
} from "~/orpc/dog/service";
import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";

// Every procedure here is for customers and scoped to the signed-in owner's own dogs.

/*===== List =====*/
export const listDogsProcedure = base.dog.list
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(({ context }) => listDogs({ db: context.db, ownerId: context.user.id }));

/*===== Get =====*/
export const getDogProcedure = base.dog.get
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await getDog({ db: context.db, ownerId: context.user.id, id: input.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });

    return { ...result.dog, fileCard: buildDogFileCard({ fileNumber: result.dog.fileNumber }) };
  });

/*===== Create =====*/
export const createDogProcedure = base.dog.create
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await createDog({ db: context.db, ownerId: context.user.id, input });

    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.dog;
  });

/*===== Update =====*/
export const updateDogProcedure = base.dog.update
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { id, ...details } = input;
    const result = await updateDog({ db: context.db, ownerId: context.user.id, id, input: details });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.dog;
  });

/*===== Admin =====*/
export const adminListDogsProcedure = base.dog.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context }) => adminListDogs({ db: context.db }));

export const adminGetDogProcedure = base.dog.admin.get
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminGetDog({ db: context.db, id: input.id });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    return { ...result.dog, fileCard: buildDogFileCard({ fileNumber: result.dog.fileNumber }) };
  });

export const adminUpdateDogProcedure = base.dog.admin.update
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const { id, ...details } = input;
    const result = await adminUpdateDog({ db: context.db, id, input: details });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }
    return result.dog;
  });

export const setPassedCourseProcedure = base.dog.admin.setPassedCourse
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminSetPassedCourse({ db: context.db, adminId: context.user.id, ...input });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    return result.dog;
  });
