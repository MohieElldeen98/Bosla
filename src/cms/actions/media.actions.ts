"use server";

import { CmsMediaService } from "@/cms/services/media.service";
import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { renameMediaAssetSchema, updateMediaAssetSchema } from "@/cms/validators/media.validator";
import type { MediaLibraryAsset, ResolvedMediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaAssetUsage } from "@/cms/types/media-usage";
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

/** Server Actions are public POST endpoints: a page-level `requireRole`
 *  doesn't protect a read that's reachable from a client bundle, so the
 *  by-id/usages/folders reads below check the caller themselves, on the
 *  same Admin-sees-all / uploader-sees-own model as `searchMediaAction`. */
async function isMediaAdmin(): Promise<boolean> {
  const user = await SessionService.getCurrentUser();
  return !!user && isRoleAllowed(user.role, ["admin", "super_admin"]);
}

export async function listMediaFoldersAction(): Promise<string[]> {
  if (!(await isMediaAdmin())) return [];
  return CmsMediaService.listFolders();
}

/** The admin grid's own "open detail panel" read — a Client Component
 *  can't import `CmsMediaService` directly (server-only, `getDb()`
 *  behind it), so this is the one indirection that lets `onClick` on a
 *  grid card fetch the full (non-resolved, both-locales) asset the edit
 *  form needs. */
export async function getMediaByIdAction(id: string): Promise<MediaLibraryAsset | null> {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;
  const asset = await CmsMediaService.getLibraryById(id);
  if (!asset) return null;
  if (isRoleAllowed(user.role, ["admin", "super_admin"]) || asset.uploadedByUserId === user.id) return asset;
  return null;
}

/** `MediaPicker`'s own "resolve the currently-selected id into a
 *  preview" read — locale-resolved, same shape `searchMediaAction`'s
 *  results already are, so the picker never has to hand-flatten a raw
 *  `MediaLibraryAsset` itself. */
export async function getResolvedMediaByIdAction(id: string, locale: Locale): Promise<ResolvedMediaLibraryAsset | null> {
  // Signed-in only, not uploader-scoped: a picker legitimately previews an
  // asset someone else chose (an admin-uploaded cover on an instructor's
  // course). Anonymous callers have no picker to preview.
  if (!(await SessionService.getCurrentUser())) return null;
  return CmsMediaService.getResolvedLibraryById(id, locale);
}

/** Bulk folder move for the library's multi-select. Uploads themselves
 *  live in `media/actions/media-upload.actions.ts` — the platform's one
 *  upload surface. */
export async function moveMediaToFolderAction(
  ids: string[],
  folder: string | null,
): Promise<CmsActionResult<number>> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || ids.some((id) => typeof id !== "string")) {
    return { success: false, code: "validation_failed", message: "Invalid selection." };
  }
  const cleanFolder = folder === null ? null : String(folder).trim().slice(0, 64) || null;
  return CmsMediaService.moveToFolder(ids, cleanFolder);
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

/** The Media Library grid's "is this used anywhere" badges and the
 *  detail panel's "where" list both call this — one batched read so
 *  scrolling through the grid doesn't fire a request per card. */
export async function getMediaUsagesAction(ids: string[]): Promise<Record<string, MediaAssetUsage[]>> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || ids.some((id) => typeof id !== "string")) {
    return {};
  }
  if (!(await isMediaAdmin())) return {};
  const usages = await CmsMediaService.getUsages(ids);
  return Object.fromEntries(usages);
}
