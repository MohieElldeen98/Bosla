import { CourseRepository, type UpdateCourseRow } from "@/courses/repositories/course.repository";
import { SpecialtyRepository } from "@/courses/repositories/specialty.repository";
import { CategoryRepository } from "@/courses/repositories/category.repository";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { CmsMediaService } from "@/cms/services/media.service";
import { safeMutation, safeRead } from "@/courses/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { Course, ResolvedCourse } from "@/courses/types/course";
import type { CourseActionResult } from "@/courses/types/result";
import type { CreateCourseInput, UpdateCourseInput } from "@/courses/validators/course.validator";
import type { CourseListItem, CourseSearchFilters, CourseSearchResult } from "@/courses/types/course-search";

function toResolvedCourse(course: Course, locale: Locale): ResolvedCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: resolveLocalizedText(course.title, locale),
    description: resolveLocalizedText(course.description, locale),
    specialtyId: course.specialtyId,
    categoryId: course.categoryId,
    instructorId: course.instructorId,
    level: course.level,
    status: course.status,
    language: course.language,
    price: course.price,
    originalPrice: course.originalPrice,
    currency: course.currency,
    coverImageId: course.coverImageId,
  };
}

/**
 * Orchestration for `courses` — authorization on every mutation,
 * uniqueness on `slug`, locale resolution for reads, and the `number`
 * (validated input) → `string` (stored `numeric` column) price conversion.
 * `CourseRepository` is pure data access.
 *
 * Admin-only, matching docs/roadmap.md's Phase 3 scope: no Instructor
 * Panel/ownership model exists yet (Phase 6), so every mutation here is
 * gated the same way regardless of who the course's `instructorId` is.
 */
export const CourseService = {
  async getById(id: string): Promise<Course | null> {
    return safeRead(() => CourseRepository.findById(id), null);
  },

  async getBySlug(slug: string): Promise<Course | null> {
    return safeRead(() => CourseRepository.findBySlug(slug), null);
  },

  async list(): Promise<Course[]> {
    return safeRead(() => CourseRepository.findAll(), []);
  },

  async listBySpecialtyId(specialtyId: string): Promise<Course[]> {
    return safeRead(() => CourseRepository.findBySpecialtyId(specialtyId), []);
  },

  async listByInstructorId(instructorId: string): Promise<Course[]> {
    return safeRead(() => CourseRepository.findByInstructorId(instructorId), []);
  },

  async listPublished(): Promise<Course[]> {
    return safeRead(() => CourseRepository.findPublished(), []);
  },

  async getResolvedBySlug(slug: string, locale: Locale): Promise<ResolvedCourse | null> {
    const course = await safeRead(() => CourseRepository.findBySlug(slug), null);
    return course ? toResolvedCourse(course, locale) : null;
  },

  async listResolvedPublished(locale: Locale): Promise<ResolvedCourse[]> {
    const list = await safeRead(() => CourseRepository.findPublished(), []);
    return list.map((course) => toResolvedCourse(course, locale));
  },

  /**
   * The admin course listing's data source (Step 3.2) — paginated/
   * filtered/sorted courses with specialty/category/instructor names and
   * the cover image URL resolved, composed from parallel repository reads
   * rather than a cross-domain SQL join (the same pattern
   * `CmsPageService.getResolvedBySlug` already established). Batches each
   * lookup to one query per referenced entity type, not one per row.
   */
  async searchResolved(
    filters: CourseSearchFilters,
    locale: Locale,
  ): Promise<CourseSearchResult<CourseListItem>> {
    const result = await safeRead(() => CourseRepository.search(filters), {
      items: [] as Course[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });

    const specialtyIds = [...new Set(result.items.map((course) => course.specialtyId))];
    const categoryIds = [
      ...new Set(
        result.items
          .map((course) => course.categoryId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const instructorIds = [...new Set(result.items.map((course) => course.instructorId))];
    const coverImageIds = [
      ...new Set(
        result.items
          .map((course) => course.coverImageId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [specialties, categories, instructors, coverImages] = await Promise.all([
      safeRead(() => SpecialtyRepository.findByIds(specialtyIds), []),
      safeRead(() => CategoryRepository.findByIds(categoryIds), []),
      safeRead(() => CourseInstructorRepository.findByIds(instructorIds), []),
      Promise.all(coverImageIds.map((id) => CmsMediaService.getResolvedById(id, locale))),
    ]);

    const specialtyById = new Map(specialties.map((specialty) => [specialty.id, specialty]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));
    const coverImageById = new Map(
      coverImageIds
        .map((id, index) => [id, coverImages[index]] as const)
        .filter((entry): entry is [string, NonNullable<(typeof coverImages)[number]>] => entry[1] !== null),
    );

    const items: CourseListItem[] = result.items.map((course) => {
      const specialty = specialtyById.get(course.specialtyId);
      const category = course.categoryId ? categoryById.get(course.categoryId) : undefined;
      const instructor = instructorById.get(course.instructorId);
      const coverImage = course.coverImageId ? coverImageById.get(course.coverImageId) : undefined;

      return {
        id: course.id,
        slug: course.slug,
        title: resolveLocalizedText(course.title, locale),
        specialtyId: course.specialtyId,
        specialtyName: specialty ? resolveLocalizedText(specialty.name, locale) : course.specialtyId,
        categoryId: course.categoryId,
        categoryName: category ? resolveLocalizedText(category.name, locale) : null,
        instructorId: course.instructorId,
        instructorName: instructor ? resolveLocalizedText(instructor.name, locale) : course.instructorId,
        level: course.level,
        status: course.status,
        language: course.language,
        price: course.price,
        originalPrice: course.originalPrice,
        currency: course.currency,
        coverImageUrl: coverImage?.url ?? null,
        updatedAt: course.updatedAt,
      };
    });

    return { ...result, items };
  },

  async create(input: CreateCourseInput): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const existing = await CourseRepository.findBySlug(input.slug);
      if (existing) {
        return {
          success: false,
          code: "conflict",
          message: `A course with slug "${input.slug}" already exists.`,
        };
      }
      const created = await CourseRepository.create({
        slug: input.slug,
        title: input.title,
        description: input.description,
        specialtyId: input.specialtyId,
        categoryId: input.categoryId ?? null,
        instructorId: input.instructorId,
        level: input.level,
        status: input.status,
        language: input.language,
        price: input.price.toFixed(2),
        originalPrice: input.originalPrice !== undefined ? input.originalPrice.toFixed(2) : null,
        currency: input.currency,
        coverImageId: input.coverImageId ?? null,
      });
      return { success: true, data: created };
    });
  },

  async update(id: string, input: UpdateCourseInput): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }

      const row: UpdateCourseRow = {};
      if (input.slug !== undefined) row.slug = input.slug;
      if (input.title !== undefined) row.title = input.title;
      if (input.description !== undefined) row.description = input.description;
      if (input.specialtyId !== undefined) row.specialtyId = input.specialtyId;
      if (input.categoryId !== undefined) row.categoryId = input.categoryId;
      if (input.instructorId !== undefined) row.instructorId = input.instructorId;
      if (input.level !== undefined) row.level = input.level;
      if (input.status !== undefined) row.status = input.status;
      if (input.language !== undefined) row.language = input.language;
      if (input.price !== undefined) row.price = input.price.toFixed(2);
      if (input.originalPrice !== undefined) row.originalPrice = input.originalPrice.toFixed(2);
      if (input.currency !== undefined) row.currency = input.currency;
      if (input.coverImageId !== undefined) row.coverImageId = input.coverImageId;

      const updated = await CourseRepository.update(id, row);
      if (!updated) {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      return { success: true, data: updated };
    });
  },

  /**
   * Sets `status: "archived"` — the closest equivalent to a soft delete
   * this domain has today (`courses` has no `deletedAt` column; see
   * docs/database-overview.md §2). Thin, purpose-named wrappers around the
   * existing generic `update()` — same authorization and not-found
   * handling, no new business logic.
   */
  async archive(id: string): Promise<CourseActionResult<Course>> {
    return CourseService.update(id, { status: "archived" });
  },

  /** Restores an archived course back to `draft` — never straight back to
   *  `published`, so re-publishing is always a deliberate, separate
   *  decision once the course editor (Step 3.3) exists. */
  async restore(id: string): Promise<CourseActionResult<Course>> {
    return CourseService.update(id, { status: "draft" });
  },

  /** Hard delete — permanent, unlike `archive`. Restricted to Super Admin
   *  specifically (checked in addition to, not instead of, the baseline
   *  `requireCourseManagementAccess` gate), matching the same
   *  "irreversible/sensitive operation" pattern already established for
   *  Users & Roles and Site Settings (docs/roles-and-permissions.md §3) —
   *  a plain Admin has `archive` as the reversible alternative. */
  async delete(id: string): Promise<CourseActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      if (user.role !== "super_admin") {
        return {
          success: false,
          code: "forbidden",
          message: "Only a Super Admin can permanently delete a course.",
        };
      }
      await CourseRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
