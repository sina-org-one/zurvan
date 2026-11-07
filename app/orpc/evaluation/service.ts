import { randomUUID } from "node:crypto";

import type { Database, DatabaseOrTransaction } from "~/db/client.server";
import { env } from "~/env.server";
import { findAdminPhoneNumber, notify } from "~/lib/notify.server";
import { issuesToErrorData } from "~/lib/schema-issues";
import { deleteObjects, putObject, videoKey } from "~/lib/storage.server";
import type { UserRole } from "~/lib/user-constants";
import { formatNumber } from "~/lib/locale-format";
import { isUuid } from "~/lib/uuid";
import { findDogByOwnerForUpdate, lockDogById } from "~/orpc/dog/repository";
import { isDogId } from "~/orpc/dog/validation";
import {
  EVALUATION_VIDEO_CONTENT_TYPES,
  EVALUATION_VIDEO_MAX_BYTES,
  EVALUATION_VIDEO_MAX_UNSENT,
  type EvaluationStatus,
} from "~/orpc/evaluation/constants";
import type { AdminEvaluation, Evaluation, EvaluationVideo } from "~/orpc/evaluation/contract";
import { toAdminEvaluation, toEvaluation, toEvaluationVideo } from "~/orpc/evaluation/mapper";
import {
  answerRequestedEvaluation,
  attachVideos,
  countUnsentVideos,
  deleteVideoRow,
  findEvaluations,
  findOpenEvaluation,
  findPhotosByEvaluations,
  findUsedPhotoIds,
  findVideoById,
  findVideoOwnership,
  findVideosByEvaluations,
  insertEvaluation,
  insertPhotos,
  insertVideo,
  lockUnsentVideos,
  type EvaluationRow,
  type EvaluationVideoRecord,
} from "~/orpc/evaluation/repository";
import { rejectEvaluationSchema, requestEvaluationSchema } from "~/orpc/evaluation/validation";
import { detectVideoFormat, parseVideoFormat, VIDEO_SNIFF_BYTES } from "~/orpc/evaluation/video";
import { attachMedia, deleteMedia, isMediaId } from "~/orpc/media/service";
import { m } from "~/paraglide/messages";

/*===== Types =====*/
type InvalidResult = { kind: "invalid"; errors: string[]; fields: Record<string, string> };
type NotFoundResult = { kind: "not-found" };
/** The request is fine, but it contradicts the current state. `errors` is the Persian message for the user. */
type ConflictResult<Kind extends string> = { kind: Kind; errors: string[] };

/*===== Reading =====*/
async function withMedia({ db, rows }: { db: DatabaseOrTransaction; rows: EvaluationRow[] }) {
  const evaluationIds = rows.map((row) => row.evaluation.id);
  const [photos, videos] = await Promise.all([
    findPhotosByEvaluations({ db, evaluationIds }),
    findVideosByEvaluations({ db, evaluationIds }),
  ]);
  return { photos, videos };
}

async function customerViews({
  db,
  rows,
}: {
  db: DatabaseOrTransaction;
  rows: EvaluationRow[];
}): Promise<Evaluation[]> {
  const { photos, videos } = await withMedia({ db, rows });
  return rows.map((row) => toEvaluation({ row, photos, videos }));
}

async function adminViews({
  db,
  rows,
}: {
  db: DatabaseOrTransaction;
  rows: EvaluationRow[];
}): Promise<AdminEvaluation[]> {
  const { photos, videos } = await withMedia({ db, rows });
  return rows.map((row) => toAdminEvaluation({ row, photos, videos }));
}

async function adminViewOf({ db, id }: { db: DatabaseOrTransaction; id: string }): Promise<AdminEvaluation> {
  const [view] = await adminViews({ db, rows: await findEvaluations({ db, id }) });
  if (!view) throw new Error(`adminViewOf: evaluation ${id} could not be read back`);
  return view;
}

/*===== List =====*/
/** The customer's evaluations, waiting ones first; `dogId` narrows them to one dog's. */
export async function listMyEvaluations({
  db,
  customerId,
  dogId,
}: {
  db: DatabaseOrTransaction;
  customerId: string;
  dogId?: string;
}): Promise<Evaluation[]> {
  if (dogId !== undefined && !isDogId(dogId)) return [];
  return customerViews({ db, rows: await findEvaluations({ db, customerId, dogId }) });
}

/*===== Request =====*/
type RequestResult =
  { kind: "success"; evaluation: Evaluation } | InvalidResult | NotFoundResult | ConflictResult<"not-requestable">;

/**
 * Requests the free evaluation of one of the customer's dogs (F3), with photos and videos of it.
 *
 * The dog's row is locked while its evaluations are checked, so a double click or two tabs can't open two requests (a
 * partial unique index holds the same rule underneath). A dog may request only when it has no evaluation or all of its
 * evaluations ended `rejected` or `withdrawn`.
 *
 * @returns `not-found` for another customer's dog and a malformed id; `invalid` with per-field messages for the dates,
 * the free times, and photos or videos that aren't usable uploads of this customer's; `not-requestable` with the reason.
 */
export async function requestEvaluation({
  db,
  customerId,
  input,
}: {
  db: Database;
  customerId: string;
  input: unknown;
}): Promise<RequestResult> {
  const parsed = requestEvaluationSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };
  const details = parsed.data;
  if (!isDogId(details.dogId)) return { kind: "not-found" };

  /*------ Photos ------*/
  // Claimed before the transaction, like a dog's photo; the ones claimed are deleted again if the request isn't saved.
  const used = await findUsedPhotoIds({ db, mediaIds: details.photoMediaIds.filter(isMediaId) });
  const claimed: string[] = [];
  const discard = () => Promise.all(claimed.map((mediaId) => discardPhoto({ db, mediaId })));
  for (const mediaId of details.photoMediaIds) {
    const outcome =
      isMediaId(mediaId) && !used.has(mediaId)
        ? await attachMedia({ db, mediaId, kind: "evaluation", userId: customerId })
        : ({ kind: "invalid" } as const);
    if (outcome.kind !== "ok") {
      await discard();
      return { kind: "invalid", errors: [], fields: { photoMediaIds: m.server_evaluation_photos_reupload() } };
    }
    claimed.push(mediaId);
  }

  let outcome: { kind: "created"; id: string } | InvalidResult | NotFoundResult | ConflictResult<"not-requestable">;
  try {
    outcome = await db.transaction(async (tx) => {
      const dog = await findDogByOwnerForUpdate({ db: tx, ownerId: customerId, id: details.dogId });
      if (!dog) return { kind: "not-found" } as const;

      const open = await findOpenEvaluation({ db: tx, dogId: dog.id });
      if (open) {
        return {
          kind: "not-requestable",
          errors: [
            open.status === "evaluated"
              ? m.server_evaluation_already_evaluated({ dog: dog.name })
              : m.server_evaluation_already_requested({ dog: dog.name }),
          ],
        } as const;
      }

      /*------ Videos ------*/
      const videos = await lockUnsentVideos({ db: tx, uploadedBy: customerId, ids: details.videoIds.filter(isUuid) });
      if (videos.length !== details.videoIds.length) {
        return {
          kind: "invalid",
          errors: [],
          fields: { videoIds: m.server_evaluation_videos_reupload() },
        } as const;
      }

      const created = await insertEvaluation({
        db: tx,
        values: {
          dogId: dog.id,
          customerId,
          earliestDate: details.earliestDate,
          availableDays: details.availableDays,
          availablePeriods: details.availablePeriods,
        },
      });
      await insertPhotos({ db: tx, evaluationId: created.id, mediaIds: details.photoMediaIds });
      // In the order the customer put them, which `lockUnsentVideos` (ordered by id) doesn't keep.
      await attachVideos({ db: tx, evaluationId: created.id, ids: details.videoIds });
      return { kind: "created", id: created.id } as const;
    });
  } catch (error) {
    await discard();
    throw error;
  }

  if (outcome.kind !== "created") {
    await discard();
    return outcome;
  }

  const [view] = await customerViews({ db, rows: await findEvaluations({ db, id: outcome.id }) });
  if (!view) throw new Error(`requestEvaluation: evaluation ${outcome.id} could not be read back`);

  await notify({
    phoneNumber: await findAdminPhoneNumber({ db }),
    kind: "evaluation-requested",
    // The link opens the request's drawer on the Admin's Evaluations page (F9: SMS links open the drawer directly).
    body: `زروان: درخواست ارزیابی تازه برای ${view.dog.name}. با مشتری تماس بگیر.\n${env.BETTER_AUTH_URL}/admin/evaluations?evaluation=${view.id}`,
  });
  return { kind: "success", evaluation: view };
}

/** Deletes an image that is no longer an evaluation's. A failure is logged: it leaves an unused image behind. */
async function discardPhoto({ db, mediaId }: { db: Database; mediaId: string }): Promise<void> {
  try {
    await deleteMedia({ db, mediaId });
  } catch (error) {
    console.error(`[evaluation] could not delete media ${mediaId}`, error);
  }
}

/*===== Withdraw =====*/
type WithdrawResult = { kind: "success"; evaluation: Evaluation } | NotFoundResult | ConflictResult<"not-withdrawable">;

/** The customer takes back a request that hasn't been answered. `withdrawn` is final (F3). */
export async function withdrawEvaluation({
  db,
  customerId,
  id,
}: {
  db: Database;
  customerId: string;
  id: string;
}): Promise<WithdrawResult> {
  if (!isUuid(id)) return { kind: "not-found" };

  const withdrawn = await answerRequestedEvaluation({
    db,
    id,
    customerId,
    values: { status: "withdrawn", decidedAt: new Date() },
  });
  if (!withdrawn) {
    const [existing] = await findEvaluations({ db, id, customerId });
    return existing
      ? { kind: "not-withdrawable", errors: [m.server_evaluation_not_withdrawable()] }
      : { kind: "not-found" };
  }

  const [view] = await customerViews({ db, rows: await findEvaluations({ db, id }) });
  if (!view) throw new Error(`withdrawEvaluation: evaluation ${id} could not be read back`);
  return { kind: "success", evaluation: view };
}

/*===== Admin: List and Get =====*/
export async function adminListEvaluations({
  db,
  status,
  dogId,
}: {
  db: DatabaseOrTransaction;
  status?: EvaluationStatus;
  /** One dog's evaluations. A malformed id matches nothing, instead of asking Postgres for a bad uuid. */
  dogId?: string;
}): Promise<AdminEvaluation[]> {
  if (dogId !== undefined && !isDogId(dogId)) return [];
  return adminViews({ db, rows: await findEvaluations({ db, status, dogId }) });
}

export async function adminGetEvaluation({
  db,
  id,
}: {
  db: DatabaseOrTransaction;
  id: string;
}): Promise<{ kind: "success"; evaluation: AdminEvaluation } | NotFoundResult> {
  if (!isUuid(id)) return { kind: "not-found" };
  const [view] = await adminViews({ db, rows: await findEvaluations({ db, id }) });
  return view ? { kind: "success", evaluation: view } : { kind: "not-found" };
}

/*===== Admin: Answer =====*/
type AnswerResult =
  { kind: "success"; evaluation: AdminEvaluation } | InvalidResult | NotFoundResult | ConflictResult<"not-answerable">;

const NOT_ANSWERABLE_MESSAGE = "این درخواست دیگر در انتظار پاسخ نیست.";

/** Tells the customer their dog's courses are open (F9). */
async function notifyEvaluated({ view }: { view: AdminEvaluation }) {
  await notify({
    phoneNumber: view.customer.phoneNumber,
    kind: "evaluation-evaluated",
    body: `زروان: ${view.dog.name} ارزیابی شد و می‌توانی دوره‌هایش را بخری.`,
  });
}

/**
 * «ارزیابی شد»: the dog is evaluated, so its courses can be bought. Only a `requested` evaluation can be answered; the
 * update is conditional, so two answers at once can't both win.
 */
export async function evaluateRequest({ db, id }: { db: Database; id: string }): Promise<AnswerResult> {
  if (!isUuid(id)) return { kind: "not-found" };

  const answered = await answerRequestedEvaluation({ db, id, values: { status: "evaluated", decidedAt: new Date() } });
  if (!answered) return missingOrAnswered({ db, id });

  const view = await adminViewOf({ db, id });
  await notifyEvaluated({ view });
  return { kind: "success", evaluation: view };
}

/** «رد», with the reason the customer sees: the dog isn't a fit, or the meeting never happened. */
export async function rejectRequest({
  db,
  id,
  input,
}: {
  db: Database;
  id: string;
  input: unknown;
}): Promise<AnswerResult> {
  const parsed = rejectEvaluationSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid", ...issuesToErrorData(parsed.error.issues) };
  if (!isUuid(id)) return { kind: "not-found" };

  const answered = await answerRequestedEvaluation({
    db,
    id,
    values: { status: "rejected", rejectionReason: parsed.data.reason, decidedAt: new Date() },
  });
  if (!answered) return missingOrAnswered({ db, id });

  const view = await adminViewOf({ db, id });
  await notify({
    phoneNumber: view.customer.phoneNumber,
    kind: "evaluation-rejected",
    body: `زروان: درخواست ارزیابی ${view.dog.name} پذیرفته نشد: ${parsed.data.reason}`,
  });
  return { kind: "success", evaluation: view };
}

async function missingOrAnswered({
  db,
  id,
}: {
  db: Database;
  id: string;
}): Promise<NotFoundResult | ConflictResult<"not-answerable">> {
  const [existing] = await findEvaluations({ db, id });
  return existing ? { kind: "not-answerable", errors: [NOT_ANSWERABLE_MESSAGE] } : { kind: "not-found" };
}

/**
 * A dog the Admin already knows (trained before the site existed): he marks it evaluated from its profile, with no
 * request. It is recorded as an evaluation in `evaluated`. If the dog has a waiting request, that is the one answered.
 *
 * @returns `not-answerable` when the dog is evaluated already.
 */
export async function markDogEvaluated({ db, dogId }: { db: Database; dogId: string }): Promise<AnswerResult> {
  if (!isDogId(dogId)) return { kind: "not-found" };

  const outcome = await db.transaction(async (tx) => {
    if (!(await lockDogById({ db: tx, id: dogId }))) return { kind: "not-found" } as const;

    const open = await findOpenEvaluation({ db: tx, dogId });
    if (open?.status === "evaluated") {
      return {
        kind: "not-answerable",
        errors: ["این سگ قبلاً ارزیابی شده است."],
      } satisfies ConflictResult<"not-answerable">;
    }
    if (open) {
      await answerRequestedEvaluation({ db: tx, id: open.id, values: { status: "evaluated", decidedAt: new Date() } });
      return { kind: "evaluated", id: open.id } as const;
    }

    const [dogRow] = await tx.query.dog.findMany({ where: (table, { eq }) => eq(table.id, dogId), limit: 1 });
    if (!dogRow) return { kind: "not-found" } as const;
    const created = await insertEvaluation({
      db: tx,
      values: {
        dogId,
        customerId: dogRow.ownerId,
        status: "evaluated",
        decidedAt: new Date(),
        createdByAdmin: true,
      },
    });
    return { kind: "evaluated", id: created.id } as const;
  });
  if (outcome.kind !== "evaluated") return outcome;

  const view = await adminViewOf({ db, id: outcome.id });
  await notifyEvaluated({ view });
  return { kind: "success", evaluation: view };
}

/*===== Videos =====*/
// Stored as uploaded under `evaluation-video/{id}/original.{mp4|mov}` and never served by nginx: only the app streams
// them, to the people who may see them (docs/media.md, "Videos").

/**
 * The upload's refusals, as the `file` field error. Functions, so each is worded in the uploader's language when it
 * happens; the upload route sets that language (`app/routes/api_evaluation_videos/`).
 */
export const VIDEO_MESSAGES = {
  empty: () => m.server_evaluation_video_empty(),
  tooBig: () =>
    m.server_evaluation_video_too_big({ megabytes: formatNumber(EVALUATION_VIDEO_MAX_BYTES / 1024 / 1024) }),
  unsupported: () => m.server_evaluation_video_unsupported(),
  tooMany: () => m.server_evaluation_video_too_many(),
};

const FILE_NAME_MAX_LENGTH = 120;

type UploadVideoResult =
  { kind: "success"; video: EvaluationVideo } | { kind: "forbidden" } | { kind: "invalid"; message: string };

/**
 * Stores an uploaded video before its request exists: the form uploads each video as soon as it is picked. The real
 * format is read from the bytes, never from the name or `Content-Type`.
 *
 * Nothing attaches the video to an evaluation yet; {@link requestEvaluation} does when the form is sent.
 *
 * @returns `forbidden` unless the uploader is a customer; `invalid` with a message in the request's language when the
 * file is empty, too big, not an MP4 or MOV, or the customer has too many unsent videos.
 * @throws When the bucket or the database fails. The object already written is deleted first.
 */
export async function uploadEvaluationVideo({
  db,
  user,
  file,
}: {
  db: Database;
  user: { id: string; role: UserRole };
  file: File;
}): Promise<UploadVideoResult> {
  // A partner can be a customer too (the owner, 2026-11-07).
  if (user.role !== "customer" && user.role !== "partner") return { kind: "forbidden" };
  if (file.size === 0) return { kind: "invalid", message: VIDEO_MESSAGES.empty() };
  if (file.size > EVALUATION_VIDEO_MAX_BYTES) return { kind: "invalid", message: VIDEO_MESSAGES.tooBig() };

  const format = detectVideoFormat(new Uint8Array(await file.slice(0, VIDEO_SNIFF_BYTES).arrayBuffer()));
  if (!format) return { kind: "invalid", message: VIDEO_MESSAGES.unsupported() };
  if ((await countUnsentVideos({ db, uploadedBy: user.id })) >= EVALUATION_VIDEO_MAX_UNSENT) {
    return { kind: "invalid", message: VIDEO_MESSAGES.tooMany() };
  }

  const videoId = randomUUID();
  const key = videoKey({ videoId, format });

  try {
    await putObject({
      key,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: EVALUATION_VIDEO_CONTENT_TYPES[format],
      // Private: only the app serves it, and an id is never reused.
      cacheControl: "private, max-age=0",
    });
    const record = await insertVideo({
      db,
      values: {
        id: videoId,
        uploadedBy: user.id,
        format,
        fileName: file.name.split(/[\\/]/).pop()?.slice(0, FILE_NAME_MAX_LENGTH) || `video.${format}`,
        sizeBytes: file.size,
      },
    });
    return { kind: "success", video: toEvaluationVideo(record) };
  } catch (error) {
    // Deleting a key that was never written is fine. A failing cleanup must not hide the original error.
    await deleteObjects({ keys: [key] }).catch((cleanupError: unknown) =>
      console.error(`[evaluation] could not clean up the video ${videoId}`, cleanupError),
    );
    throw error;
  }
}

type FindVideoResult = { kind: "success"; video: EvaluationVideoRecord } | NotFoundResult;

/**
 * Finds a video for someone who wants to watch it. Only these may: whoever uploaded it, while it is unsent; once it
 * belongs to an evaluation, its customer and the Admin. Everyone else gets `not-found`, the same answer as for a video
 * that doesn't exist.
 */
export async function findVideoForViewer({
  db,
  viewer,
  id,
}: {
  db: Database;
  viewer: { id: string; role: UserRole };
  id: string;
}): Promise<FindVideoResult> {
  if (!isUuid(id)) return { kind: "not-found" };

  const video = await findVideoById({ db, id });
  if (!video) return { kind: "not-found" };
  if (video.uploadedBy === viewer.id) return { kind: "success", video };

  const ownership = await findVideoOwnership({ db, id });
  if (!ownership) return { kind: "not-found" };
  const allowed = viewer.role === "admin" || viewer.id === ownership.customerId;
  return allowed ? { kind: "success", video } : { kind: "not-found" };
}

/**
 * Deletes a video the customer uploaded and hasn't sent (they took it off the form). A video that is part of an
 * evaluation stays: the Admin may be watching it.
 *
 * @returns `not-found` for someone else's video, one already sent, and a malformed id alike.
 * @throws When the bucket fails; the row stays, so the delete can be retried.
 */
export async function discardEvaluationVideo({
  db,
  userId,
  id,
}: {
  db: Database;
  userId: string;
  id: string;
}): Promise<{ kind: "success" } | NotFoundResult> {
  if (!isUuid(id)) return { kind: "not-found" };

  const video = await findVideoById({ db, id });
  if (!video || video.uploadedBy !== userId || video.evaluationId !== null) return { kind: "not-found" };

  // The bucket first: if it fails the row stays and the delete can be retried; the other order could leave an object
  // nothing points to.
  await deleteObjects({ keys: [videoKey({ videoId: video.id, format: parseVideoFormat(video.format) })] });
  await deleteVideoRow({ db, id });
  return { kind: "success" };
}
