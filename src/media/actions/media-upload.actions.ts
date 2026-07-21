"use server";

import { MediaUploadService } from "@/media/services/media-upload.service";
import {
  abortMediaUploadSchema,
  completeMediaUploadSchema,
  createMediaUploadSchema,
  signMediaUploadPartsSchema,
} from "@/media/validators/media-upload.validator";
import type { MediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaUploadSession } from "@/media/types/media-platform";
import type { SignedPartUrl } from "@/media/storage/types";
import type { CmsActionResult } from "@/cms/types/result";

/**
 * The Media Platform's server-action surface — thin zod-parse wrappers
 * over `MediaUploadService`, which owns authorization. This is the ONLY
 * upload entry point for non-lesson-video files anywhere in Bosla; the
 * video domain's `video.actions.ts` is its lesson-video counterpart.
 */

function validationFailed(issues: { message: string }[]): CmsActionResult<never> {
  return {
    success: false,
    code: "validation_failed",
    message: issues.map((issue) => issue.message).join(" "),
  };
}

export async function createMediaUploadAction(
  rawInput: unknown,
): Promise<CmsActionResult<MediaUploadSession>> {
  const parsed = createMediaUploadSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return MediaUploadService.createUpload(parsed.data);
}

export async function signMediaUploadPartsAction(
  rawInput: unknown,
): Promise<CmsActionResult<SignedPartUrl[]>> {
  const parsed = signMediaUploadPartsSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return MediaUploadService.signParts(parsed.data);
}

export async function completeMediaUploadAction(
  rawInput: unknown,
): Promise<CmsActionResult<MediaLibraryAsset>> {
  const parsed = completeMediaUploadSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return MediaUploadService.completeUpload(parsed.data);
}

export async function abortMediaUploadAction(rawInput: unknown): Promise<CmsActionResult> {
  const parsed = abortMediaUploadSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return MediaUploadService.abortUpload(parsed.data);
}

/** Lets upload UIs render their "not configured" placeholder without
 *  attempting an upload first. */
export async function isMediaStorageConfiguredAction(): Promise<boolean> {
  const { getMediaStorage } = await import("@/media/storage");
  return getMediaStorage() !== null;
}

/** Processing-state poll for the upload UI. */
export async function getMediaAssetStatusAction(
  assetId: string,
): Promise<{ processingStatus: MediaLibraryAsset["processingStatus"] } | null> {
  const { CmsMediaService } = await import("@/cms/services/media.service");
  const asset = await CmsMediaService.getLibraryById(assetId);
  return asset ? { processingStatus: asset.processingStatus } : null;
}
