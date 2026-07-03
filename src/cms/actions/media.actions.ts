"use server";

import { CmsMediaService } from "@/cms/services/media.service";
import {
  renameMediaAssetSchema,
  updateMediaAssetSchema,
  uploadMediaMetadataSchema,
} from "@/cms/validators/media.validator";
import type { MediaLibraryAsset, ResolvedMediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaSearchFilters, MediaSearchResult } from "@/cms/types/media-search";
import type { CmsActionResult } from "@/cms/types/result";
import type { Locale } from "@/i18n/routing";

/**
 * Read actions — `CmsMediaService.search`/`.listFolders` are themselves
 * unrestricted (see that service's doc comment), so these two don't
 * parse/validate an `actingUser`; they exist purely so a Client
 * Component (`MediaPicker`, embedded in an arbitrary form anywhere in
 * the app, with no server-rendered page of its own to fetch through)
 * can reach the library at all — Services are server-only and can't be
 * imported into a `"use client"` file directly.
 */
export async function searchMediaAction(
  filters: MediaSearchFilters,
  locale: Locale,
): Promise<MediaSearchResult<ResolvedMediaLibraryAsset>> {
  return CmsMediaService.search(filters, locale);
}

export async function listMediaFoldersAction(): Promise<string[]> {
  return CmsMediaService.listFolders();
}

/** The admin grid's own "open detail panel" read — a Client Component
 *  can't import `CmsMediaService` directly (server-only, `getDb()`
 *  behind it), so this is the one indirection that lets `onClick` on a
 *  grid card fetch the full (non-resolved, both-locales) asset the edit
 *  form needs. */
export async function getMediaByIdAction(id: string): Promise<MediaLibraryAsset | null> {
  return CmsMediaService.getLibraryById(id);
}

/** `MediaPicker`'s own "resolve the currently-selected id into a
 *  preview" read — locale-resolved, same shape `searchMediaAction`'s
 *  results already are, so the picker never has to hand-flatten a raw
 *  `MediaLibraryAsset` itself. */
export async function getResolvedMediaByIdAction(id: string, locale: Locale): Promise<ResolvedMediaLibraryAsset | null> {
  return CmsMediaService.getResolvedLibraryById(id, locale);
}

/**
 * Media Library Server Actions (Phase 7, Step 7.1) — `uploadMediaAction`
 * is the one action here that takes `FormData` instead of a plain
 * object, since a `File` can't cross the Server Action boundary as JSON.
 * "Multiple upload" (the admin UI's own scope, not this action's) is the
 * client calling this once per file, not a batch endpoint — the same
 * "one file per call" simplicity every browser upload widget already
 * assumes.
 */
export async function uploadMediaAction(formData: FormData): Promise<CmsActionResult<MediaLibraryAsset>> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, code: "validation_failed", message: "No file was provided." };
  }

  const rawMetadata = formData.get("metadata");
  let metadata: unknown = undefined;
  if (typeof rawMetadata === "string" && rawMetadata.length > 0) {
    try {
      metadata = JSON.parse(rawMetadata);
    } catch {
      return { success: false, code: "validation_failed", message: "Invalid metadata payload." };
    }
  }
  const parsedMetadata = metadata !== undefined ? uploadMediaMetadataSchema.safeParse(metadata) : null;
  if (parsedMetadata && !parsedMetadata.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsedMetadata.error.issues.map((issue) => issue.message).join(" "),
    };
  }

  const rawWidth = formData.get("width");
  const rawHeight = formData.get("height");
  const width = typeof rawWidth === "string" && rawWidth !== "" ? Number(rawWidth) : undefined;
  const height = typeof rawHeight === "string" && rawHeight !== "" ? Number(rawHeight) : undefined;

  return CmsMediaService.upload({
    file,
    fileName: file.name,
    contentType: file.type,
    width,
    height,
    metadata: parsedMetadata?.success ? parsedMetadata.data : undefined,
  });
}

export async function updateMediaAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CmsActionResult<MediaLibraryAsset>> {
  const parsed = updateMediaAssetSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsMediaService.update(id, parsed.data, expectedUpdatedAt);
}

export async function renameMediaAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CmsActionResult<MediaLibraryAsset>> {
  const parsed = renameMediaAssetSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsMediaService.rename(id, parsed.data, expectedUpdatedAt);
}

export async function deleteMediaAction(id: string): Promise<CmsActionResult> {
  return CmsMediaService.delete(id);
}
