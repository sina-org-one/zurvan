import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "~/env.server";
import type { EvaluationVideoFormat } from "~/orpc/evaluation/constants";
import type { MediaKind } from "~/orpc/media/constants";

/*===== S3 Client =====*/
let client: S3Client | undefined;

/** Created on first use, so importing this module never needs the S3 variables (the demo deploy has none). */
function getClient(): S3Client {
  client ??= new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    // SeaweedFS serves buckets by path (`/zurvann/...`), not by subdomain.
    forcePathStyle: true,
    // The SDK's default checksums add headers that S3-compatible stores don't all accept; send them only when required.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

/*===== Keys and URLs =====*/
/** The bucket key of one variant: `{kind}/{mediaId}/{variant}.webp`. */
export function mediaKey({ kind, mediaId, variant }: { kind: MediaKind; mediaId: string; variant: string }): string {
  return `${kind}/${mediaId}/${variant}.webp`;
}

/** The public URL of one variant, under `MEDIA_PUBLIC_URL` (SeaweedFS in development, nginx's `/media` in production). */
export function mediaUrl({ kind, mediaId, variant }: { kind: MediaKind; mediaId: string; variant: string }): string {
  return `${env.MEDIA_PUBLIC_URL.replace(/\/+$/, "")}/${mediaKey({ kind, mediaId, variant })}`;
}

/** The bucket key of an evaluation video: `evaluation-video/{videoId}/original.{format}`. Never served by nginx. */
export function videoKey({ videoId, format }: { videoId: string; format: EvaluationVideoFormat }): string {
  return `evaluation-video/${videoId}/original.${format}`;
}

/**
 * The bucket key of a partner application's document: `partner-document/{documentId}/original.{format}`. Never served
 * by the media route: only `/api/partner-documents/{id}`, for the Admin.
 */
export function partnerDocumentKey({ documentId, format }: { documentId: string; format: string }): string {
  return `partner-document/${documentId}/original.${format}`;
}

/*===== Writes =====*/
/**
 * Puts one object into the bucket.
 *
 * @param cacheControl Defaults to forever: a media key never changes content (a replaced image gets a new ID).
 */
export async function putObject({
  key,
  body,
  contentType,
  cacheControl = "public, max-age=31536000, immutable",
}: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

/**
 * Deletes objects from the bucket. A key that doesn't exist counts as deleted, so a retry is safe.
 *
 * @throws When the store reports any key it could not delete.
 */
export async function deleteObjects({ keys }: { keys: string[] }): Promise<void> {
  if (keys.length === 0) return;

  const result = await getClient().send(
    new DeleteObjectsCommand({
      Bucket: env.S3_BUCKET_NAME,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  );

  if (result.Errors?.length) {
    throw new Error(`Could not delete ${result.Errors.length} object(s): ${result.Errors[0]?.Message ?? "unknown"}`);
  }
}

/*===== Reads =====*/
export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  /** Bytes in `body`. */
  contentLength: number;
  /** `bytes 0-99/1000` for a ranged read; null for a whole object. */
  contentRange: string | null;
};

/**
 * Reads an object, or a byte range of it (`bytes=0-99`), as a web stream, so a video is passed on without being held in
 * memory. Returns null when the key doesn't exist.
 *
 * @throws When the store fails for any other reason, including a range it can't satisfy.
 */
export async function getObject({ key, range }: { key: string; range?: string }): Promise<StoredObject | null> {
  try {
    const result = await getClient().send(new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key, Range: range }));
    if (!result.Body) return null;
    return {
      body: result.Body.transformToWebStream(),
      contentLength: result.ContentLength ?? 0,
      contentRange: result.ContentRange ?? null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") return null;
    throw error;
  }
}
