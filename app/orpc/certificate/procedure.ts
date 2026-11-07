import { buildCertificateCard } from "~/lib/certificate.server";
import {
  adminIssueCertificate,
  adminListCertificates,
  adminRevokeCertificate,
  listMyCertificates,
  verifyCertificate,
} from "~/orpc/certificate/service";
import { base } from "~/orpc/implementer.server";
import { requireRoleMiddleware } from "~/orpc/middleware/auth/auth.middleware";
import { provideDbMiddleware } from "~/orpc/middleware/db/db.middleware";

/*===== Owner =====*/
// The owner's certificates are scoped to the signed-in owner's own dogs.
export const listMyCertificatesProcedure = base.certificate.listMine
  .use(requireRoleMiddleware("customer", "partner"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await listMyCertificates({
      db: context.db,
      ownerId: context.user.id,
      dogId: input.dogId,
      locale: context.locale,
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    return result.certificates.map((certificate) => ({
      ...certificate,
      ...buildCertificateCard({ number: certificate.number }),
    }));
  });

/*===== Public =====*/
export const verifyCertificateProcedure = base.certificate.verify
  .use(provideDbMiddleware)
  .handler(({ context, input }) => verifyCertificate({ db: context.db, number: input.number, locale: context.locale }));

/*===== Admin =====*/
export const adminListCertificatesProcedure = base.certificate.admin.list
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminListCertificates({ db: context.db, dogId: input.dogId });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    return result.certificates;
  });

export const adminIssueCertificateProcedure = base.certificate.admin.issue
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminIssueCertificate({
      db: context.db,
      issuerId: context.user.id,
      enrollmentId: input.enrollmentId,
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "not-completed") {
      throw errors.NOT_COMPLETED({ data: { errors: ["گواهی فقط برای دوره‌ی تمام‌شده صادر می‌شود."], fields: {} } });
    }
    return result.certificate;
  });

export const adminRevokeCertificateProcedure = base.certificate.admin.revoke
  .use(requireRoleMiddleware("admin"))
  .use(provideDbMiddleware)
  .handler(async ({ context, input, errors }) => {
    const result = await adminRevokeCertificate({
      db: context.db,
      adminId: context.user.id,
      id: input.id,
      reason: input.reason,
    });
    if (result.kind === "not-found") throw errors.NOT_FOUND({ data: { errors: [], fields: {} } });
    if (result.kind === "invalid")
      throw errors.INVALID_INPUT({ data: { errors: result.errors, fields: result.fields } });
    return result.certificate;
  });
