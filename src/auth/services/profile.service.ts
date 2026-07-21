import { ProfileRepository } from "@/auth/repositories/profile.repository";
import { AuthAdminRepository } from "@/auth/repositories/auth-admin.repository";
import { canModifyProfile } from "@/auth/utils/can-modify-profile";
import { calculateProfileCompleteness } from "@/auth/utils/profile-completeness";
import { isEligibleForPublicProfile } from "@/auth/utils/profile-eligibility";
import {
  updateProfileSchema,
  searchProfilesSchema,
  searchProfilesAdminSchema,
} from "@/auth/validators/profile.validator";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { logger } from "@/lib/logger";
import type {
  NewProfileInput,
  Profile,
  ProfileCompleteness,
  ProfileSearchFilters,
} from "@/auth/types/profile";
import type { ProfileActionResult } from "@/auth/types/profile-result";
import type { ProfileSearchResult } from "@/auth/types/profile-search";
import type { AuthUser } from "@/auth/types/session";

/**
 * Every `ProfileRepository` call funneled through here can throw (DB
 * unreachable, `DATABASE_URL` missing) — one wrapper instead of a
 * try/catch repeated in every method, mirroring `AuthService`'s
 * `runAuthOperation`. Read paths degrade to a safe empty value; mutation
 * paths degrade to a `ProfileActionResult` failure.
 */
async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[ProfileService]", error);
    return fallback;
  }
}

async function safeMutation<T>(
  operation: () => Promise<ProfileActionResult<T>>,
): Promise<ProfileActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[ProfileService]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

/**
 * Orchestration layer for the Profile domain — validation, authorization,
 * business rules, and defaults live here; `ProfileRepository` is pure data
 * access, `db/schema/profiles.ts` is pure storage shape. No React imports,
 * no UI. See docs/authentication-architecture.md "Profile lifecycle".
 */
export const ProfileService = {
  /**
   * Called from `AuthService.signUp` right after the Supabase Auth
   * identity is created. Idempotent (delegates to
   * `ProfileRepository.create`) — safe to call even though the
   * `handle_new_user()` DB trigger (drizzle/0001_*.sql) is also racing to
   * create the same row; whichever wins, the other is a no-op merge, never
   * a duplicate. Role defaults to `student` and status to `pending`
   * inside the repository — bootstrap never accepts a caller-supplied
   * role/status.
   */
  async bootstrapProfile(input: NewProfileInput): Promise<Profile> {
    return ProfileRepository.create(input);
  },

  async getByUserId(userId: string): Promise<Profile | null> {
    return safeRead(() => ProfileRepository.findByUserId(userId), null);
  },

  async getByUserIds(userIds: string[]): Promise<Profile[]> {
    return safeRead(() => ProfileRepository.findByUserIds(userIds), []);
  },

  /** Resolves a content-attribution row's `profileId` bridge (e.g.
   *  `courses/types/instructor.ts`'s `Instructor.profileId`) back to the
   *  real profile — cross-domain callers use this rather than importing
   *  `ProfileRepository` directly, the same convention `getByUserId(s)`
   *  already established. */
  async getByProfileId(id: string): Promise<Profile | null> {
    return safeRead(() => ProfileRepository.findById(id), null);
  },

  /** Every non-deleted Admin/Super-Admin's `userId` — the Notifications
   *  domain's "notify all Admins" fan-out (instructor application
   *  submitted, course submitted for review) is the only caller. */
  async listAdminUserIds(): Promise<string[]> {
    return safeRead(() => ProfileRepository.findAdminUserIds(), []);
  },

  /** The User Details page's (Phase 7) "Authentication Provider" field —
   *  `null` when the Admin API is unreachable or the field isn't set,
   *  treated as "unknown," not an error (shown "if available," per that
   *  page's own scope). */
  async getAuthProvider(userId: string): Promise<string | null> {
    const identity = await safeRead(() => AuthAdminRepository.getUserIdentity(userId), null);
    return identity?.provider ?? null;
  },

  async exists(userId: string): Promise<boolean> {
    return safeRead(() => ProfileRepository.exists(userId), false);
  },

  /** Transitions `pending` → `active` once Supabase confirms the email —
   *  called from `AuthService.verifyOtp`'s `type === "signup"` branch.
   *  Never role/status-checked against an acting user: this is a system
   *  transition, not a user-initiated edit. */
  async activateProfile(userId: string): Promise<void> {
    await safeRead(async () => {
      const profile = await ProfileRepository.findByUserId(userId);
      if (profile && profile.status === "pending") {
        await ProfileRepository.update(userId, { status: "active" });
      }
      return null;
    }, null);
  },

  /** Best-effort — called from `AuthService.signIn` on every successful
   *  sign-in. Never blocks or fails the sign-in itself. */
  async recordLogin(userId: string): Promise<void> {
    await safeRead(async () => {
      await ProfileRepository.update(userId, { lastLoginAt: new Date() });
      return null;
    }, null);
  },

  async updateProfile(
    actingUser: AuthUser,
    targetUserId: string,
    rawInput: unknown,
  ): Promise<ProfileActionResult<Profile>> {
    return safeMutation(async () => {
      if (!canModifyProfile(actingUser, targetUserId)) {
        return { success: false, code: "forbidden", message: "You cannot edit this profile." };
      }

      const parsed = updateProfileSchema.partial().safeParse(rawInput);
      if (!parsed.success) {
        return {
          success: false,
          code: "validation_failed",
          message: parsed.error.issues.map((issue) => issue.message).join(" "),
        };
      }

      const updated = await ProfileRepository.update(targetUserId, parsed.data);
      if (!updated) {
        return { success: false, code: "not_found", message: "Profile not found." };
      }
      return { success: true, data: updated };
    });
  },

  async softDeleteProfile(
    actingUser: AuthUser,
    targetUserId: string,
  ): Promise<ProfileActionResult> {
    return safeMutation(async () => {
      if (!canModifyProfile(actingUser, targetUserId)) {
        return { success: false, code: "forbidden", message: "You cannot delete this profile." };
      }
      await ProfileRepository.delete(targetUserId);
      return { success: true, data: undefined };
    });
  },

  async restoreProfile(actingUser: AuthUser, targetUserId: string): Promise<ProfileActionResult<Profile>> {
    return safeMutation(async () => {
      if (!canModifyProfile(actingUser, targetUserId)) {
        return { success: false, code: "forbidden", message: "You cannot restore this profile." };
      }
      const restored = await ProfileRepository.restore(targetUserId);
      if (!restored) {
        return { success: false, code: "not_found", message: "Profile not found." };
      }
      return { success: true, data: restored };
    });
  },

  async search(rawFilters: unknown): Promise<Profile[]> {
    const parsed = searchProfilesSchema.safeParse(rawFilters);
    if (!parsed.success) return [];
    return safeRead(() => ProfileRepository.search(parsed.data as ProfileSearchFilters), []);
  },

  /** The admin Users listing's (Phase 7) data source — paginated/sorted.
   *  Reads are unrestricted here by the same convention every other
   *  admin listing's service method uses (`EnrollmentService.searchResolved`,
   *  `CourseService.searchResolved`): "who can *see* this list" is the
   *  page/route guard's job (`/admin/users` is already `super_admin`-only
   *  via `requireRole`), not every read method's. */
  async searchPaginated(rawFilters: unknown): Promise<ProfileSearchResult<Profile>> {
    const parsed = searchProfilesAdminSchema.safeParse(rawFilters);
    const filters = parsed.success ? parsed.data : {};
    return safeRead(() => ProfileRepository.searchPaginated(filters), {
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });
  },

  /** Activate/Suspend (Phase 7's Admin User Management) — deliberately
   *  `super_admin`-only, the same bar `UserRoleService.updateUserRole`
   *  sets for role changes: locking someone out of their account entirely
   *  is at least as sensitive as changing what they're allowed to do
   *  while signed in. Deliberately NOT gated by `canModifyProfile` (which
   *  would let a user "suspend" themselves via the self-access branch) —
   *  this is purely an admin-on-someone-else action. */
  async setAccountStatus(
    actingUser: AuthUser,
    targetUserId: string,
    status: "active" | "suspended",
  ): Promise<ProfileActionResult<Profile>> {
    return safeMutation(async () => {
      if (!isRoleAllowed(actingUser.role, ["super_admin"])) {
        return { success: false, code: "forbidden", message: "Only a Super Admin can change account status." };
      }
      const updated = await ProfileRepository.update(targetUserId, { status });
      if (!updated) {
        return { success: false, code: "not_found", message: "User not found." };
      }
      return { success: true, data: updated };
    });
  },

  getCompleteness(profile: Profile): ProfileCompleteness {
    return calculateProfileCompleteness(profile);
  },

  isPublicEligible(profile: Profile): boolean {
    return isEligibleForPublicProfile(profile);
  },

  /**
   * Avatar uploads go through the unified Media Platform like every
   * other file in Bosla (browser → object storage via
   * `MediaUploadZone`/`createMediaTransport`, docs/media-platform.md) —
   * this method only persists the resulting delivery URL onto the
   * profile. It replaces the deleted Supabase-Storage `uploadAvatar`,
   * which proxied bytes through the server and had no UI.
   */
  async setAvatarUrl(
    actingUser: AuthUser,
    targetUserId: string,
    avatarUrl: string,
  ): Promise<ProfileActionResult<{ avatarUrl: string }>> {
    return safeMutation(async () => {
      if (!canModifyProfile(actingUser, targetUserId)) {
        return { success: false, code: "forbidden", message: "You cannot edit this profile." };
      }
      const updated = await ProfileRepository.update(targetUserId, { avatarUrl });
      if (!updated) {
        return { success: false, code: "not_found", message: "Profile not found." };
      }
      return { success: true, data: { avatarUrl } };
    });
  },
};
