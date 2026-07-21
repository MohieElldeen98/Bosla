import "server-only";

import { EnrollmentService } from "@/learning/services/enrollment.service";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { getMediaPublicBaseUrl, getMediaStorage } from "@/media/storage";
import type { MediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaVisibility } from "@/media/types/media-platform";
import type { AuthUser } from "@/auth/types/session";

/**
 * URL minting + visibility authorization for library assets — the
 * delivery half of the Media Platform (docs/media-platform.md "Security
 * model"). The invariant: a private/protected asset never exposes a
 * permanent storage URL; everything it serves goes through
 * `/api/media/[assetId]`, which re-authorizes per request and redirects
 * to a short-lived signed URL. Public assets get a direct CDN URL when
 * `MEDIA_PUBLIC_BASE_URL` is configured, otherwise the same API route
 * (unauthenticated for them).
 */

const SIGNED_URL_TTL_SECONDS = 15 * 60;

/** The minimum shape delivery decisions need — accepted instead of the
 *  full `MediaLibraryAsset` so callers holding a fresh row mid-creation
 *  can mint URLs too. */
export interface DeliverableAsset {
  id: string;
  url: string;
  storageKey: string | null;
  thumbnailKey?: string | null;
  visibility: MediaVisibility;
  uploadedByUserId?: string | null;
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
}

/** The canonical URL to store in the `url` column / hand to renderers. */
export function mediaDeliveryUrl(asset: Pick<DeliverableAsset, "id" | "storageKey" | "visibility"> & { url?: string }): string {
  if (!asset.storageKey) {
    // Legacy Supabase-era row — its stored public URL keeps working until
    // the byte-migration script moves it (docs/media-platform.md).
    return asset.url ?? `/api/media/${asset.id}/file`;
  }
  const publicBase = getMediaPublicBaseUrl();
  if (asset.visibility === "public" && publicBase) {
    return `${publicBase}/${asset.storageKey}`;
  }
  return `/api/media/${asset.id}/file`;
}

export function mediaThumbnailUrl(asset: DeliverableAsset): string | null {
  if (!asset.thumbnailKey) return null;
  const publicBase = getMediaPublicBaseUrl();
  if (asset.visibility === "public" && publicBase) {
    return `${publicBase}/${asset.thumbnailKey}`;
  }
  return `/api/media/${asset.id}/thumbnail`;
}

export type MediaAccessResult = { ok: true } | { ok: false; status: 401 | 403 };

/**
 * Visibility gate, per docs/roles-and-permissions.md's spirit:
 *  - `public`: anyone.
 *  - `authenticated`: any signed-in user.
 *  - `private`: the uploader, or content managers (admin/super_admin).
 *  - `course_protected`: enrolled students of `relatedEntityId`'s course,
 *    that course's own instructor, or managers — the same audience the
 *    video domain's playback gate serves.
 */
export async function authorizeMediaAccess(
  actingUser: AuthUser | null,
  asset: DeliverableAsset,
): Promise<MediaAccessResult> {
  switch (asset.visibility) {
    case "public":
      return { ok: true };
    case "authenticated":
      return actingUser ? { ok: true } : { ok: false, status: 401 };
    case "private": {
      if (!actingUser) return { ok: false, status: 401 };
      if (actingUser.id === asset.uploadedByUserId) return { ok: true };
      if (isRoleAllowed(actingUser.role, ["admin", "super_admin"])) return { ok: true };
      return { ok: false, status: 403 };
    }
    case "course_protected": {
      if (!actingUser) return { ok: false, status: 401 };
      const courseId = asset.relatedEntity === "course" ? asset.relatedEntityId : null;
      if (!courseId) {
        // Misconfigured protection — fail closed for everyone but managers.
        return isRoleAllowed(actingUser.role, ["admin", "super_admin"])
          ? { ok: true }
          : { ok: false, status: 403 };
      }
      if (await EnrollmentService.isEnrolled(actingUser.id, courseId)) return { ok: true };
      const managing = await requireOwnCourseAccess(actingUser, courseId);
      return managing.ok ? { ok: true } : { ok: false, status: 403 };
    }
  }
}

/** Short-lived signed URL for the original object. */
export async function signedOriginalUrl(asset: DeliverableAsset): Promise<string | null> {
  const storage = getMediaStorage();
  if (!storage || !asset.storageKey) return null;
  return storage.createSignedDownloadUrl(asset.storageKey, SIGNED_URL_TTL_SECONDS);
}

export async function signedKeyUrl(key: string): Promise<string | null> {
  const storage = getMediaStorage();
  if (!storage) return null;
  return storage.createSignedDownloadUrl(key, SIGNED_URL_TTL_SECONDS);
}

/** Variant lookup by name for the API route — returns the storage key of
 *  a generated rendition, if the pipeline produced it. */
export function variantKeyFor(asset: MediaLibraryAsset, name: string): string | null {
  const variant = asset.variants[name as keyof typeof asset.variants];
  return variant?.key ?? null;
}
