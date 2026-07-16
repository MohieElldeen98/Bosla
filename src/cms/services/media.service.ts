import { CmsMediaRepository, type UpdateMediaAssetRow } from "@/cms/repositories/media.repository";
import { SupabaseMediaStorage } from "@/cms/repositories/media-storage.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { recordMediaAuditLog } from "@/cms/utils/media-audit-log";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { createClient } from "@/lib/supabase/server";
import {
  MEDIA_ACCEPTED_MIME_TYPES,
  MEDIA_BUCKET,
  MEDIA_MAX_FILE_SIZE_BYTES,
  getMediaStoragePath,
  resolveMediaFileType,
} from "@/cms/constants/storage";
import type { Locale } from "@/i18n/routing";
import type { MediaAsset, ResolvedMediaAsset } from "@/types/media";
import type { MediaLibraryAsset, ResolvedMediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaSearchFilters, MediaSearchResult } from "@/cms/types/media-search";
import type { CmsActionResult } from "@/cms/types/result";
import type {
  CreateMediaUploadUrlInput,
  RegisterMediaUploadInput,
  RenameMediaAssetInput,
  UpdateMediaAssetInput,
} from "@/cms/validators/media.validator";

function toResolvedMediaLibraryAsset(asset: MediaLibraryAsset, locale: Locale): ResolvedMediaLibraryAsset {
  return {
    id: asset.id,
    url: asset.url,
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
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/**
 * Orchestration for `cms_media_assets` — the Media Library. Authorization on every mutation (`requireCmsAccess`,
 * Admin/Super Admin only, the same boundary every other CMS domain
 * uses); reads (`getById`, `getResolvedById`, `search`, `getLibraryById`)
 * are unrestricted, the same "reads are unrestricted, only mutations
 * gate" convention `CourseService`/`CouponService` already established
 * — a `MediaPicker` embedded in an Instructor-facing form still needs to
 * *read* the library even though only an Admin can *upload* to it.
 */
export const CmsMediaService = {
  async getById(id: string): Promise<MediaAsset | null> {
    return safeRead(() => CmsMediaRepository.findById(id), null);
  },

  async getResolvedById(id: string, locale: Locale): Promise<ResolvedMediaAsset | null> {
    const asset = await safeRead(() => CmsMediaRepository.findById(id), null);
    if (!asset) return null;
    return {
      id: asset.id,
      url: asset.url,
      alt: asset.alt[locale],
      width: asset.width,
      height: asset.height,
      placeholder: asset.placeholder,
    };
  },

  async getLibraryById(id: string): Promise<MediaLibraryAsset | null> {
    return safeRead(() => CmsMediaRepository.findLibraryById(id), null);
  },

  async getResolvedLibraryById(id: string, locale: Locale): Promise<ResolvedMediaLibraryAsset | null> {
    const asset = await safeRead(() => CmsMediaRepository.findLibraryById(id), null);
    return asset ? toResolvedMediaLibraryAsset(asset, locale) : null;
  },

  async getResolvedByIds(ids: string[], locale: Locale): Promise<ResolvedMediaLibraryAsset[]> {
    const assets = await safeRead(() => CmsMediaRepository.findByIds(ids), []);
    return assets.map((asset) => toResolvedMediaLibraryAsset(asset, locale));
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

  async createUploadUrl(input: CreateMediaUploadUrlInput): Promise<CmsActionResult<{ assetId: string; storagePath: string; token: string }>> {
    return safeMutation(async () => {
      // Wider than `requireCmsAccess`: Instructors author blog articles
      // from the public site and need to upload covers/inline media.
      // Every upload records `uploadedByUserId`, and `searchMediaAction`
      // scopes non-admin browsing to the caller's own uploads.
      const sessionUser = await SessionService.getCurrentUser();
      const user =
        sessionUser && isRoleAllowed(sessionUser.role, ["instructor", "admin", "super_admin"])
          ? sessionUser
          : null;
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot upload media." };
      }
      if (!MEDIA_ACCEPTED_MIME_TYPES.includes(input.contentType)) {
        return { success: false, code: "validation_failed", message: `Unsupported file type: ${input.contentType}.` };
      }
      if (input.fileSize > MEDIA_MAX_FILE_SIZE_BYTES) {
        return {
          success: false,
          code: "validation_failed",
          message: `File is too large (max ${Math.floor(MEDIA_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB).`,
        };
      }

      const id = crypto.randomUUID();
      const storagePath = getMediaStoragePath(id, input.contentType);
      const supabase = await createClient();
      const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(storagePath);
      if (error || !data?.token) throw error ?? new Error("Could not create upload URL.");
      return { success: true, data: { assetId: id, storagePath, token: data.token } };
    });
  },

  async registerUpload(input: RegisterMediaUploadInput): Promise<CmsActionResult<MediaLibraryAsset>> {
    return safeMutation(async () => {
      const sessionUser = await SessionService.getCurrentUser();
      const user = sessionUser && isRoleAllowed(sessionUser.role, ["instructor", "admin", "super_admin"]) ? sessionUser : null;
      if (!user) return { success: false, code: "forbidden", message: "You cannot upload media." };

      const pathMatch = /^library\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp|gif|svg|mp4|webm|mov|pdf)$/i.exec(input.storagePath);
      if (!pathMatch || pathMatch[1].toLowerCase() !== input.assetId.toLowerCase()) {
        return { success: false, code: "validation_failed", message: "Invalid media storage path." };
      }
      const extensionToMime: Record<string, string> = {
        jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
        mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", pdf: "application/pdf",
      };
      const mimeType = extensionToMime[pathMatch[2].toLowerCase()];
      const supabase = await createClient();
      const { data: info, error: infoError } = await supabase.storage.from(MEDIA_BUCKET).info(input.storagePath);
      if (infoError || !info) return { success: false, code: "validation_failed", message: "Uploaded media was not found." };
      const fileSize = Number(info.size);
      if (!Number.isFinite(fileSize) || fileSize > MEDIA_MAX_FILE_SIZE_BYTES) {
        await SupabaseMediaStorage.remove(MEDIA_BUCKET, input.storagePath).catch(() => undefined);
        return { success: false, code: "validation_failed", message: `File is too large (max ${Math.floor(MEDIA_MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB).` };
      }

      const url = SupabaseMediaStorage.getPublicUrl(MEDIA_BUCKET, input.storagePath);
      try {
        const created = await CmsMediaRepository.create({
          id: input.assetId,
          url,
          storagePath: input.storagePath,
          fileType: resolveMediaFileType(mimeType),
          mimeType,
          fileSize,
          alt: input.metadata?.alt,
          title: input.metadata?.title,
          caption: input.metadata?.caption,
          description: input.metadata?.description,
          tags: input.metadata?.tags,
          folder: input.metadata?.folder,
          width: input.width ?? null,
          height: input.height ?? null,
          placeholder: input.placeholder ?? null,
          uploadedByUserId: user.id,
        });
        await recordMediaAuditLog({
          action: "media_created",
          mediaAssetId: created.id,
          actorId: user.id,
          metadata: { fileName: input.fileName ?? input.storagePath, fileSize: created.fileSize, fileType: created.fileType },
        });
        return { success: true, data: created };
      } catch (error) {
        await SupabaseMediaStorage.remove(MEDIA_BUCKET, input.storagePath).catch(() => undefined);
        throw error;
      }
    });
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

  /** Removes the Storage object first, the DB row second — the reverse
   *  order from `upload`'s own failure-cleanup ordering, and
   *  deliberate: if Storage removal fails, the DB row (and therefore the
   *  audit trail, and every reference to this asset) stays intact rather
   *  than pointing at a Storage object that's already gone. A failed
   *  delete can be retried; a dangling reference to a deleted row can't
   *  be un-broken as easily. */
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

      await SupabaseMediaStorage.remove(MEDIA_BUCKET, existing.storagePath);
      await recordMediaAuditLog({
        action: "media_deleted",
        mediaAssetId: id,
        actorId: user.id,
        metadata: { storagePath: existing.storagePath },
      });
      await CmsMediaRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
