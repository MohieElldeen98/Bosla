/**
 * The unified Media Platform's own vocabulary (docs/media-platform.md).
 * The library asset row itself stays `cms_media_assets` (drizzle:
 * `cmsMediaAssets`) — every FK in the app already points there — but its
 * lifecycle, storage, and delivery are owned by `src/media`, and these
 * types are the contract.
 */

/** Mirrors `db/schema/cms.ts`'s `media_visibility` enum exactly. */
export const MEDIA_VISIBILITIES = [
  "public",
  "authenticated",
  "private",
  "course_protected",
] as const;
export type MediaVisibility = (typeof MEDIA_VISIBILITIES)[number];

/** Mirrors `db/schema/cms.ts`'s `media_processing_status` enum exactly. */
export const MEDIA_PROCESSING_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
] as const;
export type MediaProcessingStatus = (typeof MEDIA_PROCESSING_STATUSES)[number];

/** One generated rendition of an image asset. */
export interface MediaVariant {
  key: string;
  width: number;
  height: number;
  format: "webp" | "avif" | "jpeg";
  size: number;
}

/** Shape of `cms_media_assets.variants` — named rungs of the image
 *  ladder. All optional: non-images have `{}`, and a pipeline failure
 *  leaves whatever succeeded. */
export interface MediaVariants {
  thumb?: MediaVariant;
  small?: MediaVariant;
  medium?: MediaVariant;
  large?: MediaVariant;
  mediumAvif?: MediaVariant;
  largeAvif?: MediaVariant;
}

/** What `createMediaUploadAction` hands the browser. Small files get one
 *  presigned PUT (`mode: "single"`); large files get tus-style multipart
 *  (`mode: "multipart"`), same engine the video system uses. */
export type MediaUploadSession =
  | { mode: "single"; assetId: string; uploadUrl: string }
  | {
      mode: "multipart";
      assetId: string;
      partSize: number;
      partCount: number;
      /** Opaque provider token the client carries through its resume
       *  session; only usable via the signing action, which re-checks
       *  asset ownership on every batch. */
      uploadId: string;
    }
  | { mode: "duplicate"; assetId: string };

/** Files at or above this size upload via multipart (resumable); below
 *  it, a single presigned PUT is simpler and one round-trip cheaper. */
export const MEDIA_MULTIPART_THRESHOLD_BYTES = 64 * 1024 * 1024;
