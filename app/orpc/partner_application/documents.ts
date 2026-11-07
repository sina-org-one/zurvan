/*===== Partner Documents =====*/
// Browser-safe: the application form and the server read the same limits (docs/app-spec.md, F7, "Becoming a partner").

/** What a document may be: photos of a paper, or a PDF of it. Told by the bytes, never by the name. */
export const PARTNER_DOCUMENT_FORMATS = ["jpg", "png", "webp", "pdf"] as const;

export type PartnerDocumentFormat = (typeof PARTNER_DOCUMENT_FORMATS)[number];

export const PARTNER_DOCUMENT_CONTENT_TYPES: Record<PartnerDocumentFormat, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** At least one paper is required; a few more are allowed (licence, permit, shopfront). */
export const PARTNER_DOCUMENT_MIN = 1;
export const PARTNER_DOCUMENT_MAX = 4;
export const PARTNER_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;

/** What the file input offers. */
export const PARTNER_DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/** The bytes the format is told by. */
export const PARTNER_DOCUMENT_SNIFF_BYTES = 12;

/** The format from the file's first bytes, or null when it is none of the allowed ones. */
export function detectPartnerDocumentFormat(head: Uint8Array): PartnerDocumentFormat | null {
  const starts = (bytes: number[], offset = 0) => bytes.every((byte, index) => head[offset + index] === byte);
  if (starts([0xff, 0xd8, 0xff])) return "jpg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  return null;
}

export function isPartnerDocumentFormat(value: string): value is PartnerDocumentFormat {
  return (PARTNER_DOCUMENT_FORMATS as readonly string[]).includes(value);
}
