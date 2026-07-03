import { ProfileService } from "@/auth/services/profile.service";
import { UserRoleService } from "@/auth/services/user-role.service";
import { InstructorProfileRepository } from "@/instructor/repositories/instructor-profile.repository";
import { requireInstructorManagementAccess } from "@/instructor/utils/require-instructor-management-access";
import { recordInstructorProfileAuditLog } from "@/instructor/utils/audit-log";
import { safeMutation, safeRead } from "@/instructor/utils/safe-operation";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { InstructorProfile } from "@/instructor/types/instructor-profile";
import type {
  InstructorProfileListItem,
  InstructorProfileSearchFilters,
  InstructorProfileSearchResult,
} from "@/instructor/types/instructor-profile-search";
import type { InstructorActionResult } from "@/instructor/types/result";
import type { AuthUser } from "@/auth/types/session";
import type { ApplyForInstructorInput } from "@/instructor/validators/instructor-application.validator";

async function resolveInstructorProfiles(
  rows: InstructorProfile[],
  locale: Locale,
): Promise<InstructorProfileListItem[]> {
  const profiles = await ProfileService.getByUserIds(rows.map((row) => row.userId));
  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));

  return rows.map((row) => {
    const applicant = profileByUserId.get(row.userId);
    return {
      id: row.id,
      userId: row.userId,
      applicantName: applicant?.displayName ?? applicant?.fullName ?? applicant?.email ?? row.userId,
      applicantEmail: applicant?.email ?? "",
      headline: resolveLocalizedText(row.headline, locale),
      credentials: row.credentials,
      status: row.status,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

/**
 * Orchestration for `instructor_profiles` (Phase 6, Step 6.1) — the
 * "apply to become an Instructor" and Admin approve/reject workflow.
 * `apply`/`getMyApplication` are student-owned-data reads/writes (always
 * for `actingUser` themselves — no target-student parameter, matching
 * `OrderService`'s Checkout-time convention: there is no route param for
 * "whose application," so there's no user-controlled input that could
 * ever request someone else's). `searchResolved`/`approve`/`reject` are
 * Admin/Super-Admin-only management actions, gated by
 * `requireInstructorManagementAccess`.
 */
export const InstructorApplicationService = {
  async getMyApplication(actingUser: AuthUser): Promise<InstructorProfile | null> {
    return safeRead(() => InstructorProfileRepository.findByUserId(actingUser.id), null);
  },

  async apply(actingUser: AuthUser, input: ApplyForInstructorInput): Promise<InstructorActionResult<InstructorProfile>> {
    return safeMutation(async () => {
      if (actingUser.role !== "student") {
        return {
          success: false,
          code: "forbidden",
          message: "Only a student account can apply to become an Instructor.",
        };
      }

      const existing = await InstructorProfileRepository.findByUserId(actingUser.id);
      if (existing) {
        return {
          success: false,
          code: "conflict",
          message: "You have already applied to become an Instructor.",
        };
      }

      const created = await InstructorProfileRepository.create({
        userId: actingUser.id,
        headline: input.headline,
        credentials: input.credentials ?? null,
      });
      await recordInstructorProfileAuditLog({
        action: "application_submitted",
        instructorProfileId: created.id,
        actorId: actingUser.id,
      });
      return { success: true, data: created };
    });
  },

  async searchResolved(
    filters: InstructorProfileSearchFilters,
    locale: Locale,
  ): Promise<InstructorProfileSearchResult<InstructorProfileListItem>> {
    const user = await requireInstructorManagementAccess();
    if (!user) {
      return { items: [], total: 0, page: 1, pageSize: 0, totalPages: 1 };
    }
    const result = await InstructorProfileRepository.search(filters);
    const items = await resolveInstructorProfiles(result.items, locale);
    return { ...result, items };
  },

  /** Approving flips `profiles.role`/`app_metadata.role` to `instructor`
   *  via `UserRoleService` *before* marking the application approved —
   *  if the role change fails, the application stays `pending` rather
   *  than ending up "approved" with a student who was never actually
   *  promoted, an inconsistency nothing else in this step could recover
   *  from. */
  async approve(
    actingUser: AuthUser,
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<InstructorActionResult<InstructorProfile>> {
    return safeMutation(async () => {
      const user = await requireInstructorManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot review instructor applications." };
      }

      const application = await InstructorProfileRepository.findById(id);
      if (!application) {
        return { success: false, code: "not_found", message: "Application not found." };
      }
      if (application.status !== "pending") {
        return { success: false, code: "conflict", message: "This application has already been decided." };
      }

      const roleResult = await UserRoleService.updateUserRole(actingUser, application.userId, "instructor");
      if (!roleResult.success) {
        return { success: false, code: "unknown", message: roleResult.message };
      }

      const result = await InstructorProfileRepository.updateStatus(
        id,
        {
          status: "approved",
          approvedAt: new Date(),
          approvedByUserId: actingUser.id,
        },
        expectedUpdatedAt,
      );
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Application not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This application was changed by someone else. Reload to see the latest version.",
        };
      }
      await recordInstructorProfileAuditLog({
        action: "application_approved",
        instructorProfileId: result.data.id,
        actorId: actingUser.id,
      });
      return { success: true, data: result.data };
    });
  },

  async reject(
    actingUser: AuthUser,
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<InstructorActionResult<InstructorProfile>> {
    return safeMutation(async () => {
      const user = await requireInstructorManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot review instructor applications." };
      }

      const application = await InstructorProfileRepository.findById(id);
      if (!application) {
        return { success: false, code: "not_found", message: "Application not found." };
      }
      if (application.status !== "pending") {
        return { success: false, code: "conflict", message: "This application has already been decided." };
      }

      const result = await InstructorProfileRepository.updateStatus(id, { status: "rejected" }, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Application not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This application was changed by someone else. Reload to see the latest version.",
        };
      }
      await recordInstructorProfileAuditLog({
        action: "application_rejected",
        instructorProfileId: result.data.id,
        actorId: actingUser.id,
      });
      return { success: true, data: result.data };
    });
  },
};
