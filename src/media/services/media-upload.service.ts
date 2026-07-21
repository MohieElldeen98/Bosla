import "server-only";

import { logger } from "@/lib/logger";
import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { CmsMediaRepository } from "@/cms/repositories/media.repository";
import { recordMediaAuditLog } from "@/cms/utils/media-audit-log";
import { getMediaQueue } from "@/media/queue";
import { getMediaStorage } from "@/media/storage";
import { maxSizeForMime, resolveMediaFileType } from "@/media/constants/mime";
import { mediaDeliveryUrl } from "@/media/services/media-delivery.service";
import { mediaAssetPrefix, mediaOriginalKey } from "@/media/utils/storage-keys";
import {
  MEDIA_MULTIPART_THRESHOLD_BYTES,
  type MediaUploadSession,
} from "@/media/types/media-platform";
import { UPLOAD_PART_SIZE_BYTES } from "@/video/types/video";
import type { MediaLibraryAsset } from "@/cms/types/media-library";
import type { SignedPartUrl } from "@/media/storage/types";
import type { CmsActionResult } from "@/cms/types/result";
import type {
  AbortMediaUploadInput,
  CompleteMediaUploadInput,
  CreateMediaUploadInput,
  SignMediaUploadPartsInput,
} from "@/media/validators/media-upload.validator";
import type { AuthUser } from "@/auth/types/session";

const UPLOAD_URL_TTL_SECONDS = 60 * 60;

const NOT_CONFIGURED: CmsActionResult<never> = {
  success: false,
  code: "unknown",
  message: "Media storage is not configured on this deployment yet.",
};

/** Who may put bytes into the platform at all — Instructors author blog
 *  covers and course media from the public site; Admins manage the
 *  library. Matches the boundary the Supabase-era upload had. */
async function requireUploader(): Promise<AuthUser | null> {
  const sessionUser = await SessionService.getCurrentUser();
  return sessionUser && isRoleAllowed(sessionUser.role, ["instructor", "admin", "super_admin"])
    ? sessionUser
    : null;
}

/** Ownership gate for the multipart conversation: the uploader (or a
 *  manager) of a still-pending asset row. */
async function requireOwnPendingAsset(
  actingUser: AuthUser,
  assetId: string,
): Promise<CmsActionResult<MediaLibraryAsset>> {
  const asset = await CmsMediaRepository.findLibraryById(assetId);
  if (!asset || asset.processingStatus !== "pending" || !asset.storageKey) {
    return { success: false, code: "not_found", message: "No open upload found for this asset." };
  }
  if (asset.uploadedByUserId !== actingUser.id && !isRoleAllowed(actingUser.role, ["admin", "super_admin"])) {
    return { success: false, code: "forbidden", message: "You cannot touch this upload." };
  }
  return { success: true, data: asset };
}

/**
 * Replace-in-place: new bytes land under the SAME asset id (same
 * `library/<id>/` prefix), so course covers, article images, and every
 * other reference keep pointing at a live asset. The old original and
 * its variants are cleared up front — the asset is briefly unavailable
 * during the re-upload, which is acceptable for an explicit admin
 * "replace file" action and far safer than leaking mixed old/new
 * artifacts under one prefix.
 */
async function startReplace(
  user: AuthUser,
  input: CreateMediaUploadInput,
  storage: NonNullable<ReturnType<typeof getMediaStorage>>,
): Promise<CmsActionResult<MediaUploadSession>> {
  const existing = await CmsMediaRepository.findLibraryById(input.replaceAssetId!);
  if (!existing) {
    return { success: false, code: "not_found", message: "Asset to replace was not found." };
  }
  if (existing.uploadedByUserId !== user.id && !isRoleAllowed(user.role, ["admin", "super_admin"])) {
    return { success: false, code: "forbidden", message: "You cannot replace this asset." };
  }
  const storageKey = mediaOriginalKey(existing.id, input.contentType);
  await storage.deletePrefix(mediaAssetPrefix(existing.id)).catch(() => undefined);
  const updated = await CmsMediaRepository.update(existing.id, {
    storageKey,
    url: mediaDeliveryUrl({ id: existing.id, storageKey, visibility: existing.visibility }),
    fileType: resolveMediaFileType(input.contentType),
    mimeType: input.contentType,
    fileSize: input.fileSize,
    width: input.width ?? null,
    height: input.height ?? null,
    duration: null,
    pageCount: null,
    dominantColor: null,
    placeholder: input.placeholder ?? null,
    thumbnailKey: null,
    variants: {},
    processingStatus: "pending",
  });
  if (updated.status !== "ok") {
    return { success: false, code: "unknown", message: "Could not prepare the replacement." };
  }
  if (input.fileSize >= MEDIA_MULTIPART_THRESHOLD_BYTES) {
    const upload = await storage.createUpload(storageKey, input.contentType);
    return {
      success: true,
      data: {
        mode: "multipart",
        assetId: existing.id,
        partSize: UPLOAD_PART_SIZE_BYTES,
        partCount: Math.max(1, Math.ceil(input.fileSize / UPLOAD_PART_SIZE_BYTES)),
        uploadId: upload.uploadId,
      },
    };
  }
  const uploadUrl = await storage.createSignedUploadUrl(storageKey, input.contentType, UPLOAD_URL_TTL_SECONDS);
  return { success: true, data: { mode: "single", assetId: existing.id, uploadUrl } };
}

/**
 * The ONE upload backend for every non-lesson-video file in Bosla
 * (docs/media-platform.md). Browser-direct: small files get a single
 * presigned PUT; files ≥64 MB automatically switch to the same
 * resumable multipart conversation the video system uses. Bytes never
 * touch the Next.js server. Every completed upload enqueues a
 * `media.process` job (image ladder / AV metadata / document metadata).
 */
export const MediaUploadService = {
  async createUpload(input: CreateMediaUploadInput): Promise<CmsActionResult<MediaUploadSession>> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;
    const user = await requireUploader();
    if (!user) return { success: false, code: "forbidden", message: "You cannot upload media." };

    const maxSize = maxSizeForMime(input.contentType);
    if (maxSize === 0) {
      return { success: false, code: "validation_failed", message: `Unsupported file type: ${input.contentType}.` };
    }
    if (input.fileSize > maxSize) {
      return {
        success: false,
        code: "validation_failed",
        message: `File is too large (max ${Math.floor(maxSize / (1024 * 1024))}MB for this type).`,
      };
    }

    try {
      if (input.replaceAssetId) {
        return await startReplace(user, input, storage);
      }
      if (!input.allowDuplicate) {
        const duplicate = await CmsMediaRepository.findDuplicate(user.id, input.fileSize, input.fileName);
        if (duplicate) {
          return { success: true, data: { mode: "duplicate", assetId: duplicate.id } };
        }
      }

      const id = crypto.randomUUID();
      const storageKey = mediaOriginalKey(id, input.contentType);
      const localizedFileName = { en: input.fileName, ar: input.fileName };
      const created = await CmsMediaRepository.create({
        id,
        url: mediaDeliveryUrl({ id, storageKey, visibility: input.visibility }),
        storagePath: storageKey,
        storageKey,
        fileType: resolveMediaFileType(input.contentType),
        mimeType: input.contentType,
        fileSize: input.fileSize,
        title: input.metadata?.title ?? localizedFileName,
        alt: input.metadata?.alt,
        caption: input.metadata?.caption,
        description: input.metadata?.description,
        tags: input.metadata?.tags,
        folder: input.metadata?.folder,
        width: input.width ?? null,
        height: input.height ?? null,
        placeholder: input.placeholder ?? null,
        uploadedByUserId: user.id,
        processingStatus: "pending",
        visibility: input.visibility,
        relatedEntity: input.relatedEntity ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
      });

      if (input.fileSize >= MEDIA_MULTIPART_THRESHOLD_BYTES) {
        const upload = await storage.createUpload(storageKey, input.contentType);
        return {
          success: true,
          data: {
            mode: "multipart",
            assetId: created.id,
            partSize: UPLOAD_PART_SIZE_BYTES,
            partCount: Math.max(1, Math.ceil(input.fileSize / UPLOAD_PART_SIZE_BYTES)),
            uploadId: upload.uploadId,
          },
        };
      }

      const uploadUrl = await storage.createSignedUploadUrl(storageKey, input.contentType, UPLOAD_URL_TTL_SECONDS);
      return { success: true, data: { mode: "single", assetId: created.id, uploadUrl } };
    } catch (error) {
      logger.error("[media] createUpload failed:", error);
      return { success: false, code: "unknown", message: "Could not start the upload. Try again." };
    }
  },

  async signParts(input: SignMediaUploadPartsInput): Promise<CmsActionResult<SignedPartUrl[]>> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;
    const user = await requireUploader();
    if (!user) return { success: false, code: "forbidden", message: "You cannot upload media." };
    const owned = await requireOwnPendingAsset(user, input.assetId);
    if (!owned.success) return owned;
    try {
      const urls = await storage.createSignedPartUrls(
        owned.data.storageKey!,
        input.uploadId,
        input.partNumbers,
        UPLOAD_URL_TTL_SECONDS,
      );
      return { success: true, data: urls };
    } catch (error) {
      logger.error("[media] signParts failed:", error);
      return { success: false, code: "unknown", message: "Could not sign upload URLs. Try again." };
    }
  },

  async completeUpload(input: CompleteMediaUploadInput): Promise<CmsActionResult<MediaLibraryAsset>> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;
    const user = await requireUploader();
    if (!user) return { success: false, code: "forbidden", message: "You cannot upload media." };
    const owned = await requireOwnPendingAsset(user, input.assetId);
    if (!owned.success) return owned;
    const asset = owned.data;

    try {
      if (input.multipart) {
        await storage.completeUpload(asset.storageKey!, input.multipart.uploadId, input.multipart.parts);
      }
      // Trust the store, not the client, that the bytes actually landed.
      const head = await storage.head(asset.storageKey!);
      if (!head) {
        return { success: false, code: "validation_failed", message: "Uploaded file was not found in storage." };
      }
      const updated = await CmsMediaRepository.update(asset.id, {
        fileSize: head.size,
        processingStatus: "running",
      });
      if (updated.status !== "ok") {
        return { success: false, code: "unknown", message: "Upload finished but could not be recorded." };
      }
      await recordMediaAuditLog({
        action: "media_created",
        mediaAssetId: asset.id,
        actorId: user.id,
        metadata: { storageKey: asset.storageKey, fileSize: head.size, fileType: asset.fileType },
      });
      await getMediaQueue().enqueue({ name: "media.process", payload: { assetId: asset.id } });
      return { success: true, data: updated.data };
    } catch (error) {
      logger.error("[media] completeUpload failed:", error);
      return { success: false, code: "unknown", message: "Could not finalize the upload. Try again." };
    }
  },

  async abortUpload(input: AbortMediaUploadInput): Promise<CmsActionResult> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;
    const user = await requireUploader();
    if (!user) return { success: false, code: "forbidden", message: "You cannot upload media." };
    const owned = await requireOwnPendingAsset(user, input.assetId);
    if (!owned.success) return owned;
    try {
      if (input.uploadId) {
        await storage.abortUpload(owned.data.storageKey!, input.uploadId).catch(() => undefined);
      }
      await storage.deletePrefix(mediaAssetPrefix(owned.data.id)).catch(() => undefined);
      await CmsMediaRepository.delete(owned.data.id);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error("[media] abortUpload failed:", error);
      return { success: false, code: "unknown", message: "Could not cancel the upload." };
    }
  },
};
