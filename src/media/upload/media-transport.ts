"use client";

import {
  abortMediaUploadAction,
  completeMediaUploadAction,
  createMediaUploadAction,
  signMediaUploadPartsAction,
} from "@/media/actions/media-upload.actions";
import type { UploadMediaMetadataInput } from "@/cms/validators/media.validator";
import type { MediaVisibility } from "@/media/types/media-platform";
import type { CreatedUploadSession, UploadTransport } from "./engine";

/**
 * The library-asset transport — every non-lesson-video upload in Bosla
 * rides this. Single presigned PUT for small files, multipart for large
 * ones; the server decides (`MediaUploadService.createUpload`), the
 * engine just follows the session kind it gets back.
 */
export function createMediaTransport(options: {
  folder?: string | null;
  visibility?: MediaVisibility;
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
  metadata?: UploadMediaMetadataInput;
  /** Replace-in-place: route this upload's bytes under an existing
   *  asset's id instead of creating a new row. */
  replaceAssetId?: string;
  /** Client-read dimensions/blur for images, when available. */
  dimensionsFor?: (file: File) => Promise<{ width?: number; height?: number; placeholder?: string | null }>;
}): UploadTransport {
  return {
    sessionScope: `media:${options.replaceAssetId ?? options.folder ?? ""}`,

    async create(file, title): Promise<CreatedUploadSession> {
      const extras = (await options.dimensionsFor?.(file)) ?? {};
      const result = await createMediaUploadAction({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        fileSize: file.size,
        visibility: options.visibility ?? "public",
        relatedEntity: options.relatedEntity ?? null,
        relatedEntityId: options.relatedEntityId ?? null,
        width: extras.width,
        height: extras.height,
        placeholder: extras.placeholder ?? null,
        replaceAssetId: options.replaceAssetId,
        metadata: {
          ...options.metadata,
          folder: options.folder ?? options.metadata?.folder,
          title: options.metadata?.title ?? { en: title, ar: title },
        },
      });
      if (!result.success) throw new Error(result.message);
      const session = result.data;
      if (session.mode === "duplicate") return { kind: "duplicate", remoteId: session.assetId };
      if (session.mode === "single") {
        return { kind: "single", remoteId: session.assetId, url: session.uploadUrl };
      }
      return {
        kind: "multipart",
        remoteId: session.assetId,
        partSize: session.partSize,
        uploadId: session.uploadId,
      };
    },

    async signParts(remoteId, uploadId, partNumbers) {
      if (!uploadId) throw new Error("Missing multipart session.");
      const result = await signMediaUploadPartsAction({ assetId: remoteId, uploadId, partNumbers });
      if (!result.success) throw new Error(result.message);
      return result.data;
    },

    async complete(remoteId, uploadId, parts) {
      const result = await completeMediaUploadAction({
        assetId: remoteId,
        multipart: uploadId && parts ? { uploadId, parts } : undefined,
      });
      if (!result.success) throw new Error(result.message);
    },

    async abort(remoteId, uploadId) {
      await abortMediaUploadAction({ assetId: remoteId, uploadId: uploadId ?? undefined });
    },
  };
}
