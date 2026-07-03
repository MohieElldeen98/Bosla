import type { MediaFileType } from "@/cms/types/media-library";

export const MEDIA_BUCKET = "media";

/** Matches the bucket's own `allowedMimeTypes`/`fileSizeLimit` — kept
 *  here too so a rejected upload gets a real validation error before an
 *  API round-trip, not just a generic Storage failure. */
export const MEDIA_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const MEDIA_ALLOWED_MIME_TYPES: Record<Exclude<MediaFileType, "other">, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  pdf: ["application/pdf"],
};

/** Every MIME type the Media Library will actually accept — the union of
 *  `MEDIA_ALLOWED_MIME_TYPES`'s own lists, `"other"` deliberately
 *  excluded (nothing is a valid upload just because it's unclassified). */
export const MEDIA_ACCEPTED_MIME_TYPES: string[] = Object.values(MEDIA_ALLOWED_MIME_TYPES).flat();

/** `image/svg+xml` → `svg`, `application/pdf` → `pdf`, etc. — used to
 *  build a real file extension for the storage path (the browser's
 *  original filename is never trusted as the extension source, since
 *  it's easy to spoof and irrelevant to what was actually validated). */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

export function resolveMediaFileType(mimeType: string): MediaFileType {
  if ((MEDIA_ALLOWED_MIME_TYPES.image as string[]).includes(mimeType)) return "image";
  if ((MEDIA_ALLOWED_MIME_TYPES.video as string[]).includes(mimeType)) return "video";
  if ((MEDIA_ALLOWED_MIME_TYPES.pdf as string[]).includes(mimeType)) return "pdf";
  return "other";
}

export function resolveFileExtension(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] ?? "bin";
}

/** Deterministic, collision-free by construction — `assetId` is the
 *  same uuid the `cms_media_assets` row itself gets, generated *before*
 *  upload so the storage path and the row id are always the same value,
 *  the same "generate the id first, use it for the path" precedent
 *  `auth/constants/storage.ts`'s `getAvatarStoragePath` already set for
 *  avatars (there keyed by user id instead, since an avatar is 1-per-user
 *  and can safely be overwritten in place; a media asset is not, so this
 *  is keyed by its own new id instead). */
export function getMediaStoragePath(assetId: string, mimeType: string): string {
  return `library/${assetId}.${resolveFileExtension(mimeType)}`;
}
