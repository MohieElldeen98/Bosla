import { CmsMediaRepository, type UpdateMediaAssetRow } from "@/cms/repositories/media.repository";
import { findMediaUsages } from "@/cms/repositories/media-usage.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { recordMediaAuditLog } from "@/cms/utils/media-audit-log";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { getMediaStorage } from "@/media/storage";
import { mediaDeliveryUrl, mediaThumbnailUrl, mediaVariantUrl } from "@/media/services/media-delivery.service";
import { mediaAssetPrefix } from "@/media/utils/storage-keys";
import type { Locale } from "@/i18n/routing";
import type { MediaAsset, ResolvedMediaAsset } from "@/types/media";
import type { MediaLibraryAsset, ResolvedMediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaAssetUsage } from "@/cms/types/media-usage";
import type { MediaSearchFilters, MediaSearchResult } from "@/cms/types/media-search";
import type { CmsActionResult } from "@/cms/types/result";
import type {
  RenameMediaAssetInput,
  UpdateMediaAssetInput,
} from "@/cms/validators/media.validator";

function toResolvedMediaLibraryAsset(asset: MediaLibraryAsset, locale: Locale): ResolvedMediaLibraryAsset {
  return {
    id: asset.id,
    url: mediaDeliveryUrl(asset),
    storagePath: asset.storagePath,
    fileType: asset.fileType,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    alt: asset.alt ? asset.alt[locale] : null,
    title: asset.title ? asset.title[locale] : null,
    caption: asset.caption ? asset.caption[locale] : null,
    description: asset.description ? asset.description[locale] : null,
    tags: asset.tags,
    folder: asset.folder,
    width: asset.width,
    height: asset.height,
    placeholder: asset.placeholder,
    thumbnailUrl: mediaThumbnailUrl(asset),
    processingStatus: asset.processingStatus,
    visibility: asset.visibility,
    duration: asset.duration,
    pageCount: asset.pageCount,
    dominantColor: asset.dominantColor,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/** Best-effort "recently used" signal — never awaited on a render path,
 *  never allowed to fail a read. */
function touchLastUsed(id: string): void {
  void CmsMediaRepository.touchLastUsed(id).catch(() => undefined);
}

/**
 * Orchestration for the Media Library rows (`cms_media_assets`) — reads,
 * metadata edits, deletion. Upload/replace/processing live in the Media
 * Platform (`src/media` — `MediaUploadService`, `media.process` jobs,
 * docs/media-platform.md); this service never touches bytes except to
 * delete them, always through the platform's `StorageProvider`.
 * Supabase Storage is gone: legacy rows (`storageKey: null`) keep
 * serving their stored public URL until the byte-migration script moves
 * them to R2.
 *
 * Authorization: mutations require `requireCmsAccess` (Admin/Super
 * Admin); reads are unrestricted — same convention as ever ("a
 * `MediaPicker` embedded in an Instructor-facing form still needs to
 * read the library").
 */
export const CmsMediaService = {
  async getById(id: string): Promise<MediaAsset | null> {
    return safeRead(() => CmsMediaRepository.findById(id), null);
  },

  /** Uses `findLibraryById` (not the leaner `findById`) so `storageKey`/
   *  `visibility` are available to recompute the delivery URL fresh via
   *  `mediaDeliveryUrl` here, the same way `toResolvedMediaLibraryAsset`
   *  already does for `getResolvedByIds`/`search`. The stored `url`
   *  column is write-time-only (set once, at upload completion) — trusting
   *  it directly meant any asset created before a `mediaDeliveryUrl` logic
   *  change (e.g. switching to absolute URLs) stayed frozen with the old,
   *  possibly-broken value forever. Recomputing at read time instead
   *  means every asset, old or new, always reflects current delivery
   *  logic with no backfill migration ever needed.
   *
   *  `url` prefers the "medium" (1280px) pipeline rendition over the
   *  full-resolution original — this is the one resolver every content
   *  surface in the app renders images through (course/blog covers,
   *  instructor avatars, SEO og:image, the homepage Hero portrait), and
   *  none of them need the original's full pixel dimensions (often
   *  several thousand px / multiple MB straight off a phone camera) to
   *  look sharp. Falls back to the original for anything the pipeline
   *  hasn't processed (non-images, or legacy pre-pipeline rows). */
  async getResolvedById(id: string, locale: Locale): Promise<ResolvedMediaAsset | null> {
    const asset = await safeRead(() => CmsMediaRepository.findLibraryById(id), null);
    if (!asset) return null;
    touchLastUsed(id);
    return {
      id: asset.id,
      url: mediaVariantUrl(asset, "medium") ?? mediaDeliveryUrl(asset),
      alt: asset.alt ? asset.alt[locale] : "",
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      placeholder: asset.placeholder ?? undefined,
    };
  },

  async getLibraryById(id: string): Promise<MediaLibraryAsset | null> {
    return safeRead(() => CmsMediaRepository.findLibraryById(id), null);
  },

  async getResolvedLibraryById(id: string, locale: Locale): Promise<ResolvedMediaLibraryAsset | null> {
    const asset = await safeRead(() => CmsMediaRepository.findLibraryById(id), null);
    if (!asset) return null;
    touchLastUsed(id);
    return toResolvedMediaLibraryAsset(asset, locale);
  },

  async getResolvedByIds(ids: string[], locale: Locale): Promise<ResolvedMediaLibraryAsset[]> {
    const assets = await safeRead(() => CmsMediaRepository.findByIds(ids), []);
    return assets.map((asset) => toResolvedMediaLibraryAsset(asset, locale));
  },

  /** Where each of `ids` is attached across the app (instructor photos,
   *  course/blog covers, lesson videos, homepage sections, …) — the
   *  Media Library cleanup view's "is this safe to delete" answer. Keyed
   *  by asset id; an id with no entry (or an empty array) is unused. */
  async getUsages(ids: string[]): Promise<Map<string, MediaAssetUsage[]>> {
    return safeRead(() => findMediaUsages(ids), new Map());
  },

  /** Unrestricted — see this service's own doc comment for why. */
  async search(filters: MediaSearchFilters, locale: Locale): Promise<MediaSearchResult<ResolvedMediaLibraryAsset>> {
    const result = await safeRead(() => CmsMediaRepository.search(filters), {
      items: [] as MediaLibraryAsset[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 24,
      totalPages: 1,
    });
    return { ...result, items: result.items.map((asset) => toResolvedMediaLibraryAsset(asset, locale)) };
  },

  async listFolders(): Promise<string[]> {
    return safeRead(() => CmsMediaRepository.listFolders(), []);
  },

  async update(
    id: string,
    input: UpdateMediaAssetInput,
    expectedUpdatedAt?: string,
  ): Promise<CmsActionResult<MediaLibraryAsset>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage media." };
      }

      const row: UpdateMediaAssetRow = {};
      if (input.alt !== undefined) row.alt = input.alt;
      if (input.title !== undefined) row.title = input.title;
      if (input.caption !== undefined) row.caption = input.caption;
      if (input.description !== undefined) row.description = input.description;
      if (input.tags !== undefined) row.tags = input.tags;
      if (input.folder !== undefined) row.folder = input.folder;

      const result = await CmsMediaRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Media asset not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This asset was changed by someone else. Reload to see the latest version.",
        };
      }
      await recordMediaAuditLog({ action: "media_updated", mediaAssetId: result.data.id, actorId: user.id });
      return { success: true, data: result.data };
    });
  },

  /** A thin wrapper over `update`, scoped to just `title` — see
   *  `renameMediaAssetSchema`'s doc comment for why renaming is a
   *  metadata-only operation. Its own audit action (`media_renamed`)
   *  rather than reusing `media_updated`, so the audit trail can tell
   *  "changed the display name" apart from "edited alt/caption/tags." */
  async rename(
    id: string,
    input: RenameMediaAssetInput,
    expectedUpdatedAt?: string,
  ): Promise<CmsActionResult<MediaLibraryAsset>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage media." };
      }
      const result = await CmsMediaRepository.update(id, { title: input.title }, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Media asset not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This asset was changed by someone else. Reload to see the latest version.",
        };
      }
      await recordMediaAuditLog({ action: "media_renamed", mediaAssetId: result.data.id, actorId: user.id });
      return { success: true, data: result.data };
    });
  },

  /** Bulk folder move — the same authorization and audit trail as
   *  `update`, batched for the library's multi-select. */
  async moveToFolder(ids: string[], folder: string | null): Promise<CmsActionResult<number>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage media." };
      }
      let moved = 0;
      for (const id of ids) {
        const result = await CmsMediaRepository.update(id, { folder });
        if (result.status === "ok") {
          moved += 1;
          await recordMediaAuditLog({
            action: "media_updated",
            mediaAssetId: id,
            actorId: user.id,
            metadata: { movedToFolder: folder },
          });
        }
      }
      return { success: true, data: moved };
    });
  },

  /**
   * Removes the platform storage prefix first (original + every variant
   * in one `deletePrefix`), the DB row second — if storage removal
   * fails, the row (and audit trail, and references) stays intact and
   * the delete can be retried; a dangling reference to a deleted row
   * can't be un-broken as easily. Legacy Supabase-era rows have no
   * platform objects to remove — their bytes disappear when the old
   * bucket itself is deleted post-migration (docs/media-platform.md).
   */
  async delete(id: string): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage media." };
      }
      const existing = await CmsMediaRepository.findLibraryById(id);
      if (!existing) {
        return { success: false, code: "not_found", message: "Media asset not found." };
      }

      if (existing.storageKey) {
        const storage = getMediaStorage();
        if (!storage) {
          return { success: false, code: "unknown", message: "Media storage is not configured." };
        }
        await storage.deletePrefix(mediaAssetPrefix(id));
      }
      await recordMediaAuditLog({
        action: "media_deleted",
        mediaAssetId: id,
        actorId: user.id,
        metadata: { storageKey: existing.storageKey ?? existing.storagePath },
      });
      await CmsMediaRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
