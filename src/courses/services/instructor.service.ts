import { CourseInstructorRepository, type UpdateInstructorRow } from "@/courses/repositories/instructor.repository";
import { CourseService } from "@/courses/services/course.service";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/courses/utils/safe-operation";
import type { AuthUser } from "@/auth/types/session";
import type { Locale } from "@/i18n/routing";
import type { Instructor, NewInstructorInput, ResolvedInstructor } from "@/courses/types/instructor";
import type { CourseActionResult } from "@/courses/types/result";
import type { UpdateInstructorInput, UpdateOwnInstructorInput } from "@/courses/validators/instructor.validator";

function toResolvedInstructor(instructor: Instructor, locale: Locale): ResolvedInstructor {
  return {
    id: instructor.id,
    slug: instructor.slug,
    name: resolveLocalizedText(instructor.name, locale),
    title: resolveLocalizedText(instructor.title, locale),
    qualification: resolveLocalizedText(instructor.qualification, locale),
    bio: resolveLocalizedText(instructor.bio, locale),
    specialtyId: instructor.specialtyId,
    experienceYears: instructor.experienceYears,
    avatarImageId: instructor.avatarImageId,
    publicPortraitImageId: instructor.publicPortraitImageId,
    profileId: instructor.profileId,
    isFeatured: instructor.isFeatured,
    isActive: instructor.isActive,
    displayOrder: instructor.displayOrder,
  };
}

/**
 * Orchestration for `instructors` (course attribution/content — see
 * `db/schema/course.ts`'s doc comment). Named `CourseInstructorService`,
 * not `InstructorService`, to stay unambiguous alongside the existing
 * mock-backed `InstructorService` (`src/services/instructor.service.ts`)
 * this step doesn't touch or replace.
 */
export const CourseInstructorService = {
  async getById(id: string): Promise<Instructor | null> {
    return safeRead(() => CourseInstructorRepository.findById(id), null);
  },

  /** For a single-instructor context (Phase 6, Step 6.3's Instructor
   *  Panel Create/Edit Course pages, which only ever need their own one
   *  resolved row, not the full `listResolved()`). */
  async getResolvedById(id: string, locale: Locale): Promise<ResolvedInstructor | null> {
    const instructor = await safeRead(() => CourseInstructorRepository.findById(id), null);
    return instructor ? toResolvedInstructor(instructor, locale) : null;
  },

  async getBySlug(slug: string): Promise<Instructor | null> {
    return safeRead(() => CourseInstructorRepository.findBySlug(slug), null);
  },

  async list(): Promise<Instructor[]> {
    return safeRead(() => CourseInstructorRepository.findAll(), []);
  },

  async listFeatured(): Promise<Instructor[]> {
    return safeRead(() => CourseInstructorRepository.findFeatured(), []);
  },

  async countEnrolledStudents(instructorIds: string[]): Promise<Record<string, number>> {
    return safeRead(() => CourseInstructorRepository.countEnrolledStudents(instructorIds), {});
  },

  /** Replaces the Featured Instructors selection/order in one call — the
   *  Admin Panel's "Featured Instructors" picker is the only place this is
   *  called from, so `is_featured`/`display_order` never gets edited from
   *  two different screens. */
  async setFeatured(orderedIds: string[]): Promise<CourseActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      if (orderedIds.length > 4) {
        return { success: false, code: "validation_failed", message: "You can feature up to 4 instructors." };
      }
      await CourseInstructorRepository.setFeatured(orderedIds);
      return { success: true, data: undefined };
    });
  },

  async listResolved(locale: Locale): Promise<ResolvedInstructor[]> {
    const list = await safeRead(() => CourseInstructorRepository.findAll(), []);
    return list.map((instructor) => toResolvedInstructor(instructor, locale));
  },

  async create(input: NewInstructorInput): Promise<CourseActionResult<Instructor>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const existing = await CourseInstructorRepository.findBySlug(input.slug);
      if (existing) {
        return {
          success: false,
          code: "conflict",
          message: `An instructor with slug "${input.slug}" already exists.`,
        };
      }
      const created = await CourseInstructorRepository.create(input);
      return { success: true, data: created };
    });
  },

  async update(id: string, input: UpdateInstructorInput): Promise<CourseActionResult<Instructor>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const result = await CourseInstructorRepository.update(id, input);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Instructor not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This instructor was changed by someone else. Reload to see the latest version.",
        };
      }
      return { success: true, data: result.data };
    });
  },

  async delete(id: string): Promise<CourseActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      await CourseInstructorRepository.delete(id);
      return { success: true, data: undefined };
    });
  },

  /**
   * The Instructor Profile editor (`/instructor/profile`, Phase 6, Step
   * 6.6) — an approved Instructor editing their own public course
   * attribution row (the same `instructors` row `CourseService.createOwn`
   * auto-creates on first course, resolved here via
   * `CourseService.getOwnInstructor`, not a second copy of that
   * profile-to-instructor lookup). Only the public bio fields
   * (`name`/`title`/`qualification`/`bio`/`experienceYears`/
   * `avatarImageId`) are editable this way — `slug`/`specialtyId`/
   * `isFeatured`/`isActive`/`displayOrder`/`profileId` stay
   * Admin-managed identity/curation fields, untouched by this method.
   *
   * Not audit-logged — no existing audit table fits a courseId-less
   * event (`course_audit_logs.courseId` is `NOT NULL`), and self-editing
   * one's own public bio isn't audited anywhere else in this codebase
   * either (`profiles` edits aren't audited). Adding a new table/column
   * for this one event would be a disproportionate new abstraction for
   * what Step 6.6 asks for.
   */
  async updateOwn(
    actingUser: AuthUser,
    input: UpdateOwnInstructorInput,
    expectedUpdatedAt?: string,
  ): Promise<CourseActionResult<Instructor>> {
    return safeMutation(async () => {
      if (!isRoleAllowed(actingUser.role, ["instructor"])) {
        return { success: false, code: "forbidden", message: "You can only edit your own instructor profile." };
      }
      const ownInstructor = await CourseService.getOwnInstructor(actingUser);
      if (!ownInstructor) {
        return { success: false, code: "forbidden", message: "You can only edit your own instructor profile." };
      }

      const row: UpdateInstructorRow = {};
      if (input.name !== undefined) row.name = input.name;
      if (input.title !== undefined) row.title = input.title;
      if (input.qualification !== undefined) row.qualification = input.qualification;
      if (input.bio !== undefined) row.bio = input.bio;
      if (input.experienceYears !== undefined) row.experienceYears = input.experienceYears;
      if (input.avatarImageId !== undefined) row.avatarImageId = input.avatarImageId;

      const result = await CourseInstructorRepository.update(ownInstructor.id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Instructor profile not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This profile was changed elsewhere. Reload to see the latest version.",
        };
      }
      return { success: true, data: result.data };
    });
  },
};
