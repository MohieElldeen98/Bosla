import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/courses/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { Instructor, NewInstructorInput, ResolvedInstructor } from "@/courses/types/instructor";
import type { CourseActionResult } from "@/courses/types/result";
import type { UpdateInstructorInput } from "@/courses/validators/instructor.validator";

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

  async getBySlug(slug: string): Promise<Instructor | null> {
    return safeRead(() => CourseInstructorRepository.findBySlug(slug), null);
  },

  async list(): Promise<Instructor[]> {
    return safeRead(() => CourseInstructorRepository.findAll(), []);
  },

  async listFeatured(): Promise<Instructor[]> {
    return safeRead(() => CourseInstructorRepository.findFeatured(), []);
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
      const updated = await CourseInstructorRepository.update(id, input);
      if (!updated) {
        return { success: false, code: "not_found", message: "Instructor not found." };
      }
      return { success: true, data: updated };
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
};
