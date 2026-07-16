"use server";

import { CmsMediaService } from "@/cms/services/media.service";
import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import {
  createMediaUploadUrlSchema,
  registerMediaUploadSchema,
  renameMediaAssetSchema,
  updateMediaAssetSchema,
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
  // Privacy scoping: Admins browse the whole library; an Instructor's
  // picker only ever lists their own uploads (`uploadedByUserId` is
  // forced here, never trusted from the client); everyone else gets
  // nothing. The public site never calls this — it resolves assets by id.
  const user = await SessionService.getCurrentUser();
  if (!user) {
    return { items: [], total: 0, page: 1, pageSize: filters.pageSize ?? 24, totalPages: 1 };
  }
  const scoped: MediaSearchFilters = isRoleAllowed(user.role, ["admin", "super_admin"])
    ? filters
    : { ...filters, uploadedByUserId: user.id };
  return CmsMediaService.search(scoped, locale);
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

export async function createMediaUploadUrlAction(rawInput: unknown): Promise<CmsActionResult<{ assetId: string; storagePath: string; token: string }>> {
  const parsed = createMediaUploadUrlSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }
  return CmsMediaService.createUploadUrl(parsed.data);
}

export async function registerMediaUploadAction(rawInput: unknown): Promise<CmsActionResult<MediaLibraryAsset>> {
  const parsed = registerMediaUploadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, code: "validation_failed", message: parsed.error.issues.map((issue) => issue.message).join(" ") };
  }
  return CmsMediaService.registerUpload(parsed.data);
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
