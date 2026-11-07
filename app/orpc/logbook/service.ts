import type { Database, DatabaseOrTransaction } from "~/db/client.server";
import { describeDogAge } from "~/lib/dog-format";
import { normalizeFileNumber } from "~/lib/dog-file";
import { PUBLIC_RECORD_CONSENT } from "~/lib/public-record";
import { issuesToErrorData } from "~/lib/schema-issues";
import type { UserRole } from "~/lib/user-constants";
import { isUuid } from "~/lib/uuid";
import { findCertificatesByDog } from "~/orpc/certificate/repository";
import { findStandingConsents } from "~/orpc/consent/repository";
import { giveDogConsent, withdrawDogConsent } from "~/orpc/consent/service";
import { isDogId } from "~/orpc/dog/validation";
import type { LogbookEntry, PublicStatus, RecordAnswer } from "~/orpc/logbook/contract";
import { toLogbookEntry } from "~/orpc/logbook/mapper";
import { isRecordPublic, type PublicRecordRules } from "~/orpc/logbook/public";
import {
  enrollmentBelongsToDog,
  findCompletedCourses,
  findDogByFileNumber,
  findDogForPublicRecord,
  findDogOwner,
  findEntriesByDog,
  findEntryById,
  insertEntry,
  updateEntry,
} from "~/orpc/logbook/repository";
import { sessionFieldsSchema } from "~/orpc/logbook/validation";
import type { Locale } from "~/paraglide/runtime";

/*===== Types =====*/
type NotFoundResult = { kind: "not-found" };
type InvalidResult = { kind: "invalid"; errors: string[]; fields: Record<string, string> };

/*===== Locate =====*/
/**
 * Where this person's own page for the dog with this file number is. The Admin's is any dog's; a customer's is their own
 * dog's; nobody else gets one, and neither does a number that is malformed or doesn't exist: all of those are `null`.
 */
export async function locateDog({
  db,
  user,
  fileNumber,
}: {
  db: DatabaseOrTransaction;
  user: { id: string; role: UserRole };
  fileNumber: string;
}): Promise<{ path: string } | null> {
  const normalized = normalizeFileNumber(fileNumber);
  if (!normalized) return null;

  const found = await findDogByFileNumber({ db, fileNumber: normalized });
  if (!found) return null;

  if (user.role === "admin") return { path: `/admin/dogs/${found.id}` };
  if ((user.role === "customer" || user.role === "partner") && found.ownerId === user.id)
    return { path: `/account/dogs/${found.id}` };
  return null;
}

/*===== Reading =====*/
type ListResult = { kind: "success"; entries: LogbookEntry[] } | NotFoundResult;

/**
 * A dog's diary for its owner. Another owner's dog, a made-up id and a malformed one read the same: `not-found`, so the
 * API never says a dog exists.
 */
export async function listDogLogbook({
  db,
  ownerId,
  dogId,
  locale = "fa",
}: {
  db: DatabaseOrTransaction;
  ownerId: string;
  dogId: string;
  /** The language of the courses' names (the dog's page has an English one). */
  locale?: Locale;
}): Promise<ListResult> {
  if (!isDogId(dogId)) return { kind: "not-found" };
  const found = await findDogOwner({ db, dogId });
  if (!found || found.ownerId !== ownerId) return { kind: "not-found" };
  const rows = await findEntriesByDog({ db, dogId });
  return { kind: "success", entries: rows.map((row) => toLogbookEntry(row, { locale })) };
}

/** A dog's diary for the Admin. */
export async function adminListDogLogbook({
  db,
  dogId,
}: {
  db: DatabaseOrTransaction;
  dogId: string;
}): Promise<ListResult> {
  if (!isDogId(dogId)) return { kind: "not-found" };
  if (!(await findDogOwner({ db, dogId }))) return { kind: "not-found" };
  return { kind: "success", entries: (await findEntriesByDog({ db, dogId })).map((row) => toLogbookEntry(row)) };
}

/*===== Writing =====*/
type WriteResult = { kind: "success"; entry: LogbookEntry } | NotFoundResult | InvalidResult;

/** A session's course, if given, must be one of this dog's. */
async function checkEnrollment({
  db,
  dogId,
  enrollmentId,
}: {
  db: DatabaseOrTransaction;
  dogId: string;
  enrollmentId: string | null;
}): Promise<InvalidResult | null> {
  if (enrollmentId === null) return null;
  // A malformed id would make Postgres throw, and it can't be this dog's enrollment either way.
  if (!isUuid(enrollmentId) || !(await enrollmentBelongsToDog({ db, enrollmentId, dogId }))) {
    return { kind: "invalid", errors: [], fields: { enrollmentId: "این دوره مال این سگ نیست." } };
  }
  return null;
}

/** The Admin writes one session down for a dog. */
export async function adminAddEntry({
  db,
  authorId,
  input,
}: {
  db: Database;
  authorId: string;
  input: { dogId: string } & Record<string, unknown>;
}): Promise<WriteResult> {
  if (!isDogId(input.dogId) || !(await findDogOwner({ db, dogId: input.dogId }))) return { kind: "not-found" };

  const { dogId, ...fields } = input;
  const parsed = sessionFieldsSchema.safeParse(fields);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };

  const refused = await checkEnrollment({ db, dogId, enrollmentId: parsed.data.enrollmentId });
  if (refused) return refused;

  const id = await insertEntry({ db, dogId, authorId, values: parsed.data });
  const saved = await findEntryById({ db, id });
  if (!saved) throw new Error(`adminAddEntry: entry ${id} could not be read back`);
  return { kind: "success", entry: toLogbookEntry(saved) };
}

/** The Admin corrects a session. */
export async function adminUpdateEntry({
  db,
  input,
}: {
  db: Database;
  input: { id: string } & Record<string, unknown>;
}): Promise<WriteResult> {
  if (!isUuid(input.id)) return { kind: "not-found" };
  const existing = await findEntryById({ db, id: input.id });
  if (!existing) return { kind: "not-found" };

  const { id, ...fields } = input;
  const parsed = sessionFieldsSchema.safeParse(fields);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };

  const refused = await checkEnrollment({ db, dogId: existing.entry.dogId, enrollmentId: parsed.data.enrollmentId });
  if (refused) return refused;

  await updateEntry({ db, id, values: parsed.data });
  const saved = await findEntryById({ db, id });
  if (!saved) throw new Error(`adminUpdateEntry: entry ${id} could not be read back`);
  return { kind: "success", entry: toLogbookEntry(saved) };
}

/*===== The Public Record =====*/
// A dog's record is private unless its owner made it public (docs/app-spec.md, F14). `rules` is the consent wording in
// force (the registry's by default); a test passes its own to switch the choice on.

type RulesOption = { rules?: PublicRecordRules };

/**
 * What anyone may see at a file number. «private» for everything but a record whose owner has a standing agreement to the
 * wording in force: no wording, no agreement, a withdrawn one, an agreement to an older version, a number that doesn't
 * exist and text that isn't a number all give the same answer. A public record is built field by field from what the
 * record may show, so nothing else (owner, phone, payments, weight, microchip, notes about behavior or health, photos,
 * the exact birth date, private diary entries, revoked certificates, unfinished courses) can be in it.
 */
export async function getPublicRecord({
  db,
  fileNumber,
  rules = PUBLIC_RECORD_CONSENT,
  locale = "fa",
}: {
  db: DatabaseOrTransaction;
  fileNumber: string;
  /** The language of the dog's age and the courses' names (the record is a public page, with an English one). */
  locale?: Locale;
} & RulesOption): Promise<RecordAnswer> {
  /** A course's name in the record's language, Persian where the English isn't written. */
  const titleOf = (course: { title: string; titleEn: string | null }) =>
    locale === "en" && course.titleEn ? course.titleEn : course.title;
  const normalized = normalizeFileNumber(fileNumber);
  if (!normalized || !rules) return { kind: "private" };

  const found = await findDogForPublicRecord({ db, fileNumber: normalized });
  if (!found) return { kind: "private" };
  if (!(await isRecordPublic({ db, ownerId: found.ownerId, dogId: found.id, rules }))) return { kind: "private" };

  const [courses, certificates, entries] = await Promise.all([
    findCompletedCourses({ db, dogId: found.id }),
    findCertificatesByDog({ db, dogId: found.id }),
    findEntriesByDog({ db, dogId: found.id }),
  ]);

  return {
    kind: "public",
    record: {
      fileNumber: found.fileNumber,
      dog: {
        name: found.name,
        breed: found.breed,
        ageText: describeDogAge(
          { birthDate: found.birthDate, birthDateApproximate: found.birthDateApproximate },
          undefined,
          locale,
        ),
      },
      courses: courses.map((entry) => ({
        title: titleOf(entry),
        latinName: entry.latinName,
        completedAt: entry.completedAt,
      })),
      certificates: certificates
        .filter((row) => row.certificate.revokedAt === null)
        .map((row) => ({
          number: row.certificate.number,
          courseTitle: titleOf(row.course),
          issuedAt: row.certificate.issuedAt,
        })),
      entries: entries
        .filter((row) => row.entry.isPublic)
        .map((row) => ({
          occurredOn: row.entry.occurredOn,
          notes: row.entry.notes,
          exercises: row.entry.exercises,
          progress: row.entry.progress,
          courseTitle: row.course ? titleOf(row.course) : null,
        })),
    },
  };
}

type StatusResult = { kind: "success"; status: PublicStatus } | NotFoundResult;

async function statusOf({
  db,
  ownerId,
  dogId,
  rules,
}: {
  db: DatabaseOrTransaction;
  ownerId: string;
  dogId: string;
  rules: PublicRecordRules;
}): Promise<PublicStatus> {
  if (!rules) return { available: false, isPublic: false, version: null, since: null };
  const standing = (await findStandingConsents({ db, userId: ownerId, kind: "public-logbook", dogId })).find(
    (agreement) => agreement.version === rules.version,
  );
  return {
    available: true,
    isPublic: standing !== undefined,
    version: rules.version,
    since: standing?.acceptedAt ?? null,
  };
}

/** Whether the owner's own dog can be made public, and whether it is. Another owner's dog reads as `not-found`. */
export async function getPublicStatus({
  db,
  ownerId,
  dogId,
  rules = PUBLIC_RECORD_CONSENT,
}: {
  db: DatabaseOrTransaction;
  ownerId: string;
  dogId: string;
} & RulesOption): Promise<StatusResult> {
  if (!isDogId(dogId)) return { kind: "not-found" };
  const found = await findDogOwner({ db, dogId });
  if (!found || found.ownerId !== ownerId) return { kind: "not-found" };
  return { kind: "success", status: await statusOf({ db, ownerId, dogId, rules }) };
}

type SetPublicResult = StatusResult | { kind: "not-published" };

/**
 * Makes the owner's dog record public (recording their agreement to the wording in force, with its version and time) or
 * private again (always allowed, and at once; the record of having agreed stays). Turning it on with no approved wording
 * is `not-published` and changes nothing.
 */
export async function setRecordPublic({
  db,
  ownerId,
  dogId,
  isPublic,
  rules = PUBLIC_RECORD_CONSENT,
  now = new Date(),
}: {
  db: Database;
  ownerId: string;
  dogId: string;
  isPublic: boolean;
  now?: Date;
} & RulesOption): Promise<SetPublicResult> {
  if (!isDogId(dogId)) return { kind: "not-found" };
  const found = await findDogOwner({ db, dogId });
  if (!found || found.ownerId !== ownerId) return { kind: "not-found" };

  if (isPublic) {
    if (!rules) return { kind: "not-published" };
    await giveDogConsent({ db, userId: ownerId, dogId, kind: "public-logbook", version: rules.version, now });
  } else {
    await withdrawDogConsent({ db, userId: ownerId, dogId, kind: "public-logbook", now });
  }
  return { kind: "success", status: await statusOf({ db, ownerId, dogId, rules }) };
}
