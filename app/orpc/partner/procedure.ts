import { buildReferralCard } from "~/lib/referral-card.server";
import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";
import type { DatabaseOrTransaction } from "~/db/client.server";
import {
  acceptPartnerTerms,
  addLead,
  adminListPartners,
  ensureReferrerRow,
  createPartner,
  getPartnerProfile,
  isPartnerPhone,
  listMyPeople,
  setPartnerActive,
  updatePartnerProfile,
} from "~/orpc/partner/service";

/*===== Customer Referrers =====*/
/** A customer refers friends from a `partner` row of their own, made the first time they need it (F7). */
async function prepareReferrer({
  db,
  user,
}: {
  db: DatabaseOrTransaction;
  user: { id: string; role?: string | null };
}) {
  if (user.role === "customer") await ensureReferrerRow({ db, userId: user.id });
}

/*===== Profile =====*/
// Only ever touch the signed-in partner's own row.
export const getMyPartnerProfileProcedure = base.partner.getMine
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, errors }) => {
    await prepareReferrer({ db: context.db, user: context.user });
    const result = await getPartnerProfile({ db: context.db, userId: context.user.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });

    return { ...result.profile, ...buildReferralCard({ code: result.profile.code }) };
  });

export const updateMyPartnerProfileProcedure = base.partner.updateMine
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    await prepareReferrer({ db: context.db, user: context.user });
    const result = await updatePartnerProfile({ db: context.db, userId: context.user.id, input });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.profile;
  });

export const acceptMyTermsProcedure = base.partner.acceptTerms
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, errors }) => {
    await prepareReferrer({ db: context.db, user: context.user });
    const result = await acceptPartnerTerms({ db: context.db, userId: context.user.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });

    return result.profile;
  });

/*===== Partner Sign-in =====*/
// Public: asked before the sign-in code is sent, by someone who isn't signed in yet.
export const isPartnerPhoneProcedure = base.partner.isPartnerPhone
  .use(provideDbMiddleware)
  .handler(async ({ context, input }) => ({
    isPartner: await isPartnerPhone({ db: context.db, phoneNumber: input.phoneNumber }),
  }));

/*===== Leads =====*/
export const listMyLeadsProcedure = base.partner.leads.list
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, errors }) => {
    await prepareReferrer({ db: context.db, user: context.user });
    const result = await listMyPeople({ db: context.db, userId: context.user.id });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });

    return result.people;
  });

export const addLeadProcedure = base.partner.leads.add
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    await prepareReferrer({ db: context.db, user: context.user });
    const result = await addLead({ db: context.db, userId: context.user.id, input });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.person;
  });

/*===== Admin =====*/
export const adminListPartnersProcedure = base.partner.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(({ context }) => adminListPartners({ db: context.db }));

export const adminCreatePartnerProcedure = base.partner.admin.create
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await createPartner({ db: context.db, input });

    if (result.kind === "invalid") {
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    }

    return result.partner;
  });

export const adminSetPartnerActiveProcedure = base.partner.admin.setActive
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await setPartnerActive({ db: context.db, id: input.id, isActive: input.isActive });

    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });

    return result.partner;
  });
