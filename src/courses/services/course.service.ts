import { CourseRepository, type UpdateCourseRow } from "@/courses/repositories/course.repository";
import { SpecialtyRepository } from "@/courses/repositories/specialty.repository";
import { CategoryRepository } from "@/courses/repositories/category.repository";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { recordCourseAuditLog } from "@/courses/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { CmsMediaService } from "@/cms/services/media.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { safeMutation, safeRead } from "@/courses/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/types/i18n";
import type { Course, ResolvedCourse } from "@/courses/types/course";
import type { CourseActionResult } from "@/courses/types/result";
import type { CourseAuditAction } from "@/courses/types/course-audit-log";
import type { CreateCourseInput, UpdateCourseInput } from "@/courses/validators/course.validator";
import type { CourseListItem, CourseSearchFilters, CourseSearchResult } from "@/courses/types/course-search";

function resolveLocalizedTextArray(values: LocalizedText[], locale: Locale): string[] {
  return values.map((value) => resolveLocalizedText(value, locale));
}

function toResolvedCourse(course: Course, locale: Locale): ResolvedCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: resolveLocalizedText(course.title, locale),
    subtitle: resolveLocalizedText(course.subtitle, locale),
    description: resolveLocalizedText(course.description, locale),
    shortDescription: resolveLocalizedText(course.shortDescription, locale),
    specialtyId: course.specialtyId,
    categoryId: course.categoryId,
    instructorId: course.instructorId,
    level: course.level,
    status: course.status,
    language: course.language,
    price: course.price,
    originalPrice: course.originalPrice,
    currency: course.currency,
    isFree: course.isFree,
    estimatedDurationMinutes: course.estimatedDurationMinutes,
    certificateAvailable: course.certificateAvailable,
    featured: course.featured,
    requirements: resolveLocalizedTextArray(course.requirements, locale),
    learningObjectives: resolveLocalizedTextArray(course.learningObjectives, locale),
    targetAudience: resolveLocalizedTextArray(course.targetAudience, locale),
    coverImageId: course.coverImageId,
    thumbnailId: course.thumbnailId,
    trailerVideoId: course.trailerVideoId,
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

  /**
   * Creates the course, then best-effort-attaches a fresh, empty
   * `cms_seo_meta` row (Step 3.3 — "reuse the existing SEO editor
   * pattern"; `cms_seo_meta` was already designed to be reusable beyond
   * `cms_pages`, see its schema doc comment). If that sub-step fails, the
   * course itself is still successfully created with `seoMetaId: null` —
   * `attachSeoMeta` below is the fallback the Course Editor calls in that
   * case, so a transient SEO-creation failure never blocks creating the
   * course.
   */
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
        subtitle: input.subtitle ?? null,
        description: input.description,
        shortDescription: input.shortDescription ?? null,
        specialtyId: input.specialtyId,
        categoryId: input.categoryId ?? null,
        instructorId: input.instructorId,
        level: input.level,
        status: input.status,
        language: input.language,
        price: input.price.toFixed(2),
        originalPrice:
          input.originalPrice !== undefined && input.originalPrice !== null
            ? input.originalPrice.toFixed(2)
            : null,
        currency: input.currency,
        isFree: input.isFree,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
        certificateAvailable: input.certificateAvailable,
        featured: input.featured,
        requirements: input.requirements,
        learningObjectives: input.learningObjectives,
        targetAudience: input.targetAudience,
        coverImageId: input.coverImageId ?? null,
        thumbnailId: input.thumbnailId ?? null,
        trailerVideoId: input.trailerVideoId ?? null,
      });

      await recordCourseAuditLog({ action: "create", courseId: created.id, actorId: user.id });

      const seoResult = await CmsSeoService.create({});
      if (!seoResult.success) return { success: true, data: created };
      const attached = await CourseRepository.update(created.id, { seoMetaId: seoResult.data.id });
      return { success: true, data: attached.status === "ok" ? attached.data : created };
    });
  },

  /** `expectedUpdatedAt`, when given, enforces the same optimistic
   *  concurrency as CMS section/SEO saves (Step 3.3 — reuses the exact
   *  `OptimisticUpdateResult`/"conflict" pattern, see
   *  `CourseRepository.update`'s doc comment). `auditAction` lets
   *  `archive`/`restore` below share this method's authorization + result
   *  handling while still logging their own, more specific action instead
   *  of a generic "update". */
  async update(
    id: string,
    input: UpdateCourseInput,
    expectedUpdatedAt?: string,
    auditAction: CourseAuditAction = "update",
  ): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }

      const row: UpdateCourseRow = {};
      if (input.slug !== undefined) row.slug = input.slug;
      if (input.title !== undefined) row.title = input.title;
      if (input.subtitle !== undefined) row.subtitle = input.subtitle;
      if (input.description !== undefined) row.description = input.description;
      if (input.shortDescription !== undefined) row.shortDescription = input.shortDescription;
      if (input.specialtyId !== undefined) row.specialtyId = input.specialtyId;
      if (input.categoryId !== undefined) row.categoryId = input.categoryId;
      if (input.instructorId !== undefined) row.instructorId = input.instructorId;
      if (input.level !== undefined) row.level = input.level;
      if (input.status !== undefined) row.status = input.status;
      if (input.language !== undefined) row.language = input.language;
      if (input.price !== undefined) row.price = input.price.toFixed(2);
      if (input.originalPrice !== undefined) {
        row.originalPrice = input.originalPrice !== null ? input.originalPrice.toFixed(2) : null;
      }
      if (input.currency !== undefined) row.currency = input.currency;
      if (input.isFree !== undefined) row.isFree = input.isFree;
      if (input.estimatedDurationMinutes !== undefined) {
        row.estimatedDurationMinutes = input.estimatedDurationMinutes;
      }
      if (input.certificateAvailable !== undefined) row.certificateAvailable = input.certificateAvailable;
      if (input.featured !== undefined) row.featured = input.featured;
      if (input.requirements !== undefined) row.requirements = input.requirements;
      if (input.learningObjectives !== undefined) row.learningObjectives = input.learningObjectives;
      if (input.targetAudience !== undefined) row.targetAudience = input.targetAudience;
      if (input.coverImageId !== undefined) row.coverImageId = input.coverImageId;
      if (input.thumbnailId !== undefined) row.thumbnailId = input.thumbnailId;
      if (input.trailerVideoId !== undefined) row.trailerVideoId = input.trailerVideoId;

      const result = await CourseRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This course was changed by someone else. Reload the page to see the latest version.",
        };
      }

      await recordCourseAuditLog({ action: auditAction, courseId: id, actorId: user.id });
      return { success: true, data: result.data };
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
    return CourseService.update(id, { status: "archived" }, undefined, "archive");
  },

  /** Restores an archived course back to `draft` — never straight back to
   *  `published`, so re-publishing is always a deliberate, separate
   *  decision made through the Course Editor (Step 3.3). */
  async restore(id: string): Promise<CourseActionResult<Course>> {
    return CourseService.update(id, { status: "draft" }, undefined, "restore");
  },

  /** Hard delete — permanent, unlike `archive`. Restricted to Super Admin
   *  specifically (checked in addition to, not instead of, the baseline
   *  `requireCourseManagementAccess` gate), matching the same
   *  "irreversible/sensitive operation" pattern already established for
   *  Users & Roles and Site Settings (docs/roles-and-permissions.md §3) —
   *  a plain Admin has `archive` as the reversible alternative. The audit
   *  row is written before the delete (not after) since `course_audit_logs`
   *  cascades on `course_id` — logging after the row is gone would have
   *  nothing to attach to. */
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
      await recordCourseAuditLog({ action: "delete", courseId: id, actorId: user.id });
      await CourseRepository.delete(id);
      return { success: true, data: undefined };
    });
  },

  /** Fallback for a course whose `seoMetaId` is still `null` (the
   *  automatic attach in `create` didn't run or failed) — idempotent, a
   *  course that already has one is returned as-is. The Course Editor
   *  calls this once, on demand, from an "Add SEO" affordance rather than
   *  retrying automatically, so a real failure is visible instead of
   *  silently retried forever. */
  async attachSeoMeta(id: string): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const course = await CourseRepository.findById(id);
      if (!course) {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      if (course.seoMetaId) {
        return { success: true, data: course };
      }
      const seoResult = await CmsSeoService.create({});
      if (!seoResult.success) {
        return { success: false, code: "unknown", message: "Could not create the SEO record." };
      }
      const result = await CourseRepository.update(id, { seoMetaId: seoResult.data.id });
      if (result.status !== "ok") {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      return { success: true, data: result.data };
    });
  },
};
