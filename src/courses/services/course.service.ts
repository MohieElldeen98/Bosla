import { CourseRepository, type UpdateCourseRow } from "@/courses/repositories/course.repository";
import { SpecialtyRepository } from "@/courses/repositories/specialty.repository";
import { CategoryRepository } from "@/courses/repositories/category.repository";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { ProfileRepository } from "@/auth/repositories/profile.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { recordCourseAuditLog } from "@/courses/utils/audit-log";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { CmsMediaService } from "@/cms/services/media.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { safeMutation, safeRead } from "@/courses/utils/safe-operation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { ProfileService } from "@/auth/services/profile.service";
import { notify, notifyMany } from "@/notifications/utils/notify";
import { CurriculumRepository } from "@/learning/repositories/curriculum.repository";
import { buildNotificationContent } from "@/notifications/utils/notification-content";
import type { NotificationType } from "@/notifications/types/notification";
import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/types/i18n";
import type { Course, ResolvedCourse } from "@/courses/types/course";
import type { CourseStatus } from "@/courses/types/course-status";
import type { CourseActionResult } from "@/courses/types/result";
import type { CourseAuditAction } from "@/courses/types/course-audit-log";
import type { CreateCourseInput, UpdateCourseInput } from "@/courses/validators/course.validator";
import type { AuthUser } from "@/auth/types/session";
import type { Instructor } from "@/courses/types/instructor";
import type {
  CourseListItem,
  CourseSearchFilters,
  CourseSearchResult,
  PublicCourseDetail,
} from "@/courses/types/course-search";

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
 * Shared by every status-changing method below (`archive`/`restore`/
 * `submitForReview`/`approve`/`reject`) — the repository call, not-found/
 * conflict handling, and audit log are identical across all five; only
 * the target status, audit action, and *authorization* differ, so each
 * caller checks its own access first and hands this the already-verified
 * `actorId`.
 */
async function transitionStatus(
  id: string,
  status: CourseStatus,
  expectedUpdatedAt: string | undefined,
  auditAction: CourseAuditAction,
  actorId: string,
): Promise<CourseActionResult<Course>> {
  const result = await CourseRepository.update(id, { status }, expectedUpdatedAt);
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
  await recordCourseAuditLog({ action: auditAction, courseId: id, actorId });
  return { success: true, data: result.data };
}

/** Shared by `approve`/`reject` — resolves the course's owning
 *  Instructor's real account (`instructors.profileId` -> `profiles.id`
 *  -> `profiles.userId`, the same bridge `ownsCourse` above already
 *  walks in the other direction) and notifies them. A content course
 *  with no `profileId` bridge yet (an Admin-seeded course whose
 *  `instructors` row was never linked to a real account) has no one to
 *  notify — a silent no-op, not an error, same as `ownsCourse` treating
 *  an unbridged instructor as "not owned by anyone signed in." */
async function notifyCourseOwner(course: Course, type: NotificationType, contentKey: string): Promise<void> {
  const instructor = await CourseInstructorRepository.findById(course.instructorId);
  if (!instructor?.profileId) return;
  const profile = await ProfileService.getByProfileId(instructor.profileId);
  if (!profile) return;

  const content = await buildNotificationContent(contentKey, { courseTitle: course.title });
  await notify({
    recipientUserId: profile.userId,
    type,
    ...content,
    data: { courseId: course.id, courseSlug: course.slug },
  });
}

/** Shared by `submitForReview`, `updateOwn`, and `getOwnById` — resolves
 *  whether `actingUser` is the course's own instructor via
 *  `instructors.profileId` (the bridge Step 6.1 left unwired). One
 *  implementation of "does this course belong to this signed-in
 *  instructor," not a separate check per caller. */
async function ownsCourse(actingUser: AuthUser, course: Course): Promise<boolean> {
  const instructor = await CourseInstructorRepository.findById(course.instructorId);
  const profile = await ProfileRepository.findByUserId(actingUser.id);
  return !!instructor?.profileId && !!profile && instructor.profileId === profile.id;
}

/**
 * Resolves the signed-in Instructor's own content-attribution
 * `instructors` row, creating it on first use — the bridge
 * `instructors.profileId` was deliberately left unwired by Step 6.1
 * ("a later step (Course Builder) is what will wire it"), and this is
 * that step. The auto-created row uses the profile's own display name
 * for both locales (a real bilingual name isn't collected anywhere yet
 * — Instructor Profile editing is explicitly out of Step 6.3's scope)
 * and a deterministic `instructor-{profileId}` slug (already
 * lowercase-hex-and-hyphens, so it's always a valid slug and never
 * collides, without needing collision-retry logic). Read-only callers
 * (`searchResolvedForInstructor`) must NOT call this — only
 * `createOwn`, which is the one place a new course (and therefore a new
 * attribution row, if none exists yet) is actually being created.
 */
async function resolveOrCreateOwnInstructor(actingUser: AuthUser): Promise<Instructor | null> {
  const profile = await ProfileRepository.findByUserId(actingUser.id);
  if (!profile) return null;

  const existing = await CourseInstructorRepository.findByProfileId(profile.id);
  if (existing) return existing;

  const name = profile.displayName || profile.fullName || profile.email;
  return CourseInstructorRepository.create({
    slug: `instructor-${profile.id}`,
    name: { en: name, ar: name },
    profileId: profile.id,
    isActive: true,
  });
}

/** Shared by `create`/`createOwn` — builds the row and creates it, best-
 *  effort-attaching a fresh SEO record, identical for both callers.
 *  `instructorId`/`status` are passed as explicit overrides rather than
 *  read from `input` so `createOwn` can force them (an Instructor can
 *  never set either through the form) while `create` (Admin) still
 *  takes them from the validated input as before. */
async function createCourseRow(
  input: CreateCourseInput,
  overrides: { instructorId: string; status: CourseStatus },
  actorId: string,
): Promise<CourseActionResult<Course>> {
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
    instructorId: overrides.instructorId,
    level: input.level,
    status: overrides.status,
    language: input.language,
    price: input.price.toFixed(2),
    originalPrice:
      input.originalPrice !== undefined && input.originalPrice !== null ? input.originalPrice.toFixed(2) : null,
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

  await recordCourseAuditLog({ action: "create", courseId: created.id, actorId });

  const seoResult = await CmsSeoService.create({});
  if (!seoResult.success) return { success: true, data: created };
  const attached = await CourseRepository.update(created.id, { seoMetaId: seoResult.data.id });
  return { success: true, data: attached.status === "ok" ? attached.data : created };
}

/** Shared by `update`/`updateOwn` — maps every editable field from the
 *  validated input to a repository row patch. `status` was already
 *  removed from `UpdateCourseInput` entirely (Step 6.2); `instructorId`
 *  is included here since `update` (Admin) may still reassign it —
 *  `updateOwn` strips it back out of the returned row afterward. */
function buildUpdateRow(input: UpdateCourseInput): UpdateCourseRow {
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
  return row;
}

/** Shared by `update`/`updateOwn` — the repository call, not-found/
 *  conflict handling, and audit log, identical for both. */
async function applyCourseUpdate(
  id: string,
  row: UpdateCourseRow,
  expectedUpdatedAt: string | undefined,
  actorId: string,
): Promise<CourseActionResult<Course>> {
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
  await recordCourseAuditLog({ action: "update", courseId: id, actorId });
  return { success: true, data: result.data };
}

/**
 * Orchestration for `courses` — authorization on every mutation,
 * uniqueness on `slug`, locale resolution for reads, and the `number`
 * (validated input) → `string` (stored `numeric` column) price conversion.
 * `CourseRepository` is pure data access.
 *
 * Admin-only for content fields (`create`/`update`/`delete`/`attachSeoMeta`),
 * matching docs/roadmap.md's Phase 3 scope. Everything else on this
 * service takes an explicit `actingUser` and allows the course's own
 * Instructor too, the same convention `EnrollmentService` established
 * for mixing admin-management methods with owner-scoped ones in a single
 * domain service:
 * - The state machine (`submitForReview`/`approve`/`reject`, Step 6.2) —
 *   `submitForReview` allows the owning Instructor; `approve`/`reject`
 *   stay Admin/Super-Admin-only. Status can no longer be set to an
 *   arbitrary value through `update()` — only through these plus
 *   `archive`/`restore`.
 * - The Instructor Panel's own course management (`createOwn`/
 *   `updateOwn`/`searchResolvedForInstructor`/`getOwnById`/
 *   `getMyCourseCounts`, Step 6.3) — always scoped to the caller's own
 *   `instructors` row (resolved via `instructors.profileId`, the bridge
 *   Step 6.1 deliberately left unwired and `createOwn` finally wires on
 *   first use), never another Instructor's courses, and only while a
 *   course is `draft` (an Instructor loses edit access the moment it's
 *   submitted for review — matching docs/roles-and-permissions.md §2's
 *   "Author/edit own courses (**draft**)").
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
    const [specialties, categories, instructors, coverImages, lessonCounts] = await Promise.all([
      safeRead(() => SpecialtyRepository.findByIds(specialtyIds), []),
      safeRead(() => CategoryRepository.findByIds(categoryIds), []),
      safeRead(() => CourseInstructorRepository.findByIds(instructorIds), []),
      Promise.all(coverImageIds.map((id) => CmsMediaService.getResolvedById(id, locale))),
      CurriculumRepository.countLessonsByCourseIds(result.items.map((course) => course.id)),
    ]);

    const specialtyById = new Map(specialties.map((specialty) => [specialty.id, specialty]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const instructorById = new Map(instructors.map((instructor) => [instructor.id, instructor]));
    const coverImageById = new Map(
      coverImageIds
        .map((id, index) => [id, coverImages[index]] as const)
        .filter((entry): entry is [string, NonNullable<(typeof coverImages)[number]>] => entry[1] !== null),
    );
    const instructorAvatarIds = [
      ...new Set(instructors.map((instructor) => instructor.avatarImageId).filter((id): id is string => id !== null)),
    ];
    const instructorAvatars = await Promise.all(
      instructorAvatarIds.map((id) => CmsMediaService.getResolvedById(id, locale)),
    );
    const instructorAvatarById = new Map(
      instructorAvatarIds
        .map((id, index) => [id, instructorAvatars[index]] as const)
        .filter((entry): entry is [string, NonNullable<(typeof instructorAvatars)[number]>] => entry[1] !== null),
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
        subtitle: resolveLocalizedText(course.subtitle, locale),
        specialtyId: course.specialtyId,
        specialtyName: specialty ? resolveLocalizedText(specialty.name, locale) : course.specialtyId,
        categoryId: course.categoryId,
        categoryName: category ? resolveLocalizedText(category.name, locale) : null,
        instructorId: course.instructorId,
        instructorName: instructor ? resolveLocalizedText(instructor.name, locale) : course.instructorId,
        instructorAvatarUrl: instructor?.avatarImageId
          ? instructorAvatarById.get(instructor.avatarImageId)?.url ?? null
          : null,
        instructorQualification: instructor?.qualification
          ? resolveLocalizedText(instructor.qualification, locale)
          : null,
        level: course.level,
        status: course.status,
        language: course.language,
        price: course.price,
        originalPrice: course.originalPrice,
        currency: course.currency,
        isFree: course.isFree,
        featured: course.featured,
        certificateAvailable: course.certificateAvailable,
        lessonCount: lessonCounts.get(course.id) ?? 0,
        estimatedDurationMinutes: course.estimatedDurationMinutes,
        coverImageUrl: coverImage?.url ?? null,
        updatedAt: course.updatedAt,
      };
    });

    return { ...result, items };
  },

  /**
   * "My Courses" (`/instructor/courses`, Step 6.3) — reuses
   * `searchResolved` verbatim for the actual composition, but forces
   * `filters.instructorId` to the caller's own resolved `instructors`
   * row, overriding anything a caller might have passed in `filters`.
   * This is the one enforcement point that matters: even a tampered
   * `instructorId` in the URL/request can never surface another
   * Instructor's courses, since it's never read from `filters` here.
   * Returns an empty page (not an error) for an Instructor who hasn't
   * authored a course yet — no `instructors` row exists to look up.
   */
  async searchResolvedForInstructor(
    actingUser: AuthUser,
    filters: CourseSearchFilters,
    locale: Locale,
  ): Promise<CourseSearchResult<CourseListItem>> {
    const profile = await safeRead(() => ProfileRepository.findByUserId(actingUser.id), null);
    const ownInstructor = profile
      ? await safeRead(() => CourseInstructorRepository.findByProfileId(profile.id), null)
      : null;

    if (!ownInstructor) {
      const pageSize = filters.pageSize ?? 20;
      return { items: [], total: 0, page: filters.page ?? 1, pageSize, totalPages: 1 };
    }

    return CourseService.searchResolved({ ...filters, instructorId: ownInstructor.id }, locale);
  },

  /** A single own course by id, for `/instructor/courses/[id]/edit` —
   *  `null` for a course that doesn't exist *and* for one that exists but
   *  isn't the caller's own, indistinguishably (same "can't tell those
   *  apart and shouldn't" reasoning `getPublicDetailBySlug` already
   *  uses) — an Instructor probing another Instructor's course id gets
   *  the exact same "not found" a nonexistent id would. */
  async getOwnById(actingUser: AuthUser, id: string): Promise<Course | null> {
    const course = await safeRead(() => CourseRepository.findById(id), null);
    if (!course) return null;
    const owns = await ownsCourse(actingUser, course);
    return owns ? course : null;
  },

  /** Course counts by status for the Instructor Dashboard entry point
   *  (`/instructor`, Step 6.3) — no analytics/revenue/enrollment
   *  numbers, those are explicitly later Phase 6 scope; this is purely
   *  "how many of my courses are in each state." */
  async getMyCourseCounts(actingUser: AuthUser): Promise<Record<CourseStatus, number>> {
    const counts: Record<CourseStatus, number> = { draft: 0, in_review: 0, published: 0, archived: 0 };
    const profile = await safeRead(() => ProfileRepository.findByUserId(actingUser.id), null);
    const ownInstructor = profile
      ? await safeRead(() => CourseInstructorRepository.findByProfileId(profile.id), null)
      : null;
    if (!ownInstructor) return counts;

    const courses = await safeRead(() => CourseRepository.findByInstructorId(ownInstructor.id), []);
    for (const course of courses) counts[course.status] += 1;
    return counts;
  },

  /**
   * The public course detail page's (`/courses/[slug]`, Step 3.4) data
   * source — a single course with specialty/category/instructor names,
   * cover image URL, and SEO fields all resolved, composed the same way
   * `searchResolved` composes a page of rows. Returns `null` for a
   * missing slug *and* for a course that exists but isn't public yet
   * (not `published`, or its specialty/instructor/category has been
   * deactivated) — the page can't tell those apart and shouldn't: both
   * render as a 404, the same "only Published, Active courses" rule
   * `searchResolved`'s `onlyActive` filter enforces for the listing.
   */
  async getPublicDetailBySlug(slug: string, locale: Locale): Promise<PublicCourseDetail | null> {
    const course = await safeRead(() => CourseRepository.findBySlug(slug), null);
    if (!course || course.status !== "published") return null;

    const [specialty, category, instructor] = await Promise.all([
      safeRead(() => SpecialtyRepository.findById(course.specialtyId), null),
      course.categoryId
        ? safeRead(() => CategoryRepository.findById(course.categoryId!), null)
        : Promise.resolve(null),
      safeRead(() => CourseInstructorRepository.findById(course.instructorId), null),
    ]);

    if (!specialty?.isActive || !instructor?.isActive) return null;
    if (course.categoryId && !category?.isActive) return null;

    const [coverImage, seo] = await Promise.all([
      course.coverImageId ? CmsMediaService.getResolvedById(course.coverImageId, locale) : null,
      course.seoMetaId ? CmsSeoService.getResolved(course.seoMetaId, locale) : Promise.resolve(null),
    ]);
    const seoOgImage = seo?.ogImageId ? await CmsMediaService.getResolvedById(seo.ogImageId, locale) : null;

    const resolved = toResolvedCourse(course, locale);

    return {
      id: resolved.id,
      slug: resolved.slug,
      title: resolved.title,
      subtitle: resolved.subtitle,
      description: resolved.description,
      shortDescription: resolved.shortDescription,
      requirements: resolved.requirements,
      learningObjectives: resolved.learningObjectives,
      targetAudience: resolved.targetAudience,
      specialtyId: course.specialtyId,
      specialtyName: resolveLocalizedText(specialty.name, locale),
      categoryId: course.categoryId,
      categoryName: category ? resolveLocalizedText(category.name, locale) : null,
      instructorId: course.instructorId,
      instructorName: resolveLocalizedText(instructor.name, locale),
      level: resolved.level,
      language: resolved.language,
      price: resolved.price,
      originalPrice: resolved.originalPrice,
      currency: resolved.currency,
      isFree: resolved.isFree,
      featured: resolved.featured,
      certificateAvailable: resolved.certificateAvailable,
      estimatedDurationMinutes: resolved.estimatedDurationMinutes,
      coverImageUrl: coverImage?.url ?? null,
      seoTitle: seo?.title ?? null,
      seoDescription: seo?.description ?? null,
      seoOgImageUrl: seoOgImage?.url ?? null,
      seoCanonicalPath: seo?.canonicalPath ?? null,
    };
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
      return createCourseRow(input, { instructorId: input.instructorId, status: input.status }, user.id);
    });
  },

  /**
   * Resolves (creating on first use) the signed-in Instructor's own
   * content-attribution row — the Create Course page calls this to
   * populate the form's hidden `instructorId` field. It has to exist
   * *before* the form renders, not only at submit time: `courseFormSchema`
   * requires a valid `instructorId` UUID even though the field is
   * hidden, so a brand-new Instructor with no `instructors` row yet
   * would otherwise hit an unfixable validation error on their very
   * first course. Safe to call from a page render — idempotent, same
   * "defensive bootstrap" precedent `ProfileService.bootstrapProfile`
   * already established for `profiles`.
   */
  async getOwnInstructor(actingUser: AuthUser): Promise<Instructor | null> {
    return safeRead(() => resolveOrCreateOwnInstructor(actingUser), null);
  },

  /**
   * The Instructor Panel's "Create Course" (`/instructor/courses/new`,
   * Step 6.3) — an approved Instructor creating their own course.
   * Reuses `createCourseRow` verbatim; the only difference from `create`
   * is *who* may call it and that `instructorId`/`status` are always
   * forced to the caller's own resolved `instructors` row and `"draft"`,
   * never taken from `input` — an Instructor can never attribute a
   * course to someone else or skip straight past draft, even if a
   * tampered request tried to set either.
   */
  async createOwn(actingUser: AuthUser, input: CreateCourseInput): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      if (!isRoleAllowed(actingUser.role, ["instructor"])) {
        return { success: false, code: "forbidden", message: "Only an approved Instructor can create a course." };
      }
      const ownInstructor = await resolveOrCreateOwnInstructor(actingUser);
      if (!ownInstructor) {
        return { success: false, code: "forbidden", message: "Your Instructor profile could not be found." };
      }
      return createCourseRow(input, { instructorId: ownInstructor.id, status: "draft" }, actingUser.id);
    });
  },

  /** `expectedUpdatedAt`, when given, enforces the same optimistic
   *  concurrency as CMS section/SEO saves (Step 3.3 — reuses the exact
   *  `OptimisticUpdateResult`/"conflict" pattern, see
   *  `CourseRepository.update`'s doc comment). Does not touch `status` —
   *  see `transitionStatus` above and `submitForReview`/`approve`/
   *  `reject`/`archive`/`restore` below for the only ways it changes. */
  async update(
    id: string,
    input: UpdateCourseInput,
    expectedUpdatedAt?: string,
  ): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      return applyCourseUpdate(id, buildUpdateRow(input), expectedUpdatedAt, user.id);
    });
  },

  /**
   * The Instructor Panel's "Edit Course" (`/instructor/courses/[id]/edit`,
   * Step 6.3) — an approved Instructor editing their own course, only
   * while it's still `draft` (matching
   * docs/roles-and-permissions.md §2's "Author/edit own courses
   * (**draft**)" — the moment it's submitted for review, editing moves
   * to the Admin's `approve`/`reject` decision instead). `instructorId`
   * is stripped back out of the built row regardless of what `input`
   * contains — an Instructor can never reassign their own course to
   * someone else, even through this narrower path.
   */
  async updateOwn(
    actingUser: AuthUser,
    id: string,
    input: UpdateCourseInput,
    expectedUpdatedAt?: string,
  ): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      if (!isRoleAllowed(actingUser.role, ["instructor"])) {
        return { success: false, code: "forbidden", message: "Only an approved Instructor can edit a course." };
      }
      const course = await CourseRepository.findById(id);
      if (!course) {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      const owns = await ownsCourse(actingUser, course);
      if (!owns) {
        return { success: false, code: "forbidden", message: "You can only edit your own courses." };
      }
      if (course.status !== "draft") {
        return { success: false, code: "forbidden", message: "A course can only be edited while it's a draft." };
      }

      const row = buildUpdateRow(input);
      delete row.instructorId;
      return applyCourseUpdate(id, row, expectedUpdatedAt, actingUser.id);
    });
  },

  /**
   * Sets `status: "archived"` — the closest equivalent to a soft delete
   * this domain has today (`courses` has no `deletedAt` column; see
   * docs/database-overview.md §2). Unrestricted from any starting status
   * (unlike the state-machine transitions below), unchanged since Step
   * 3.2 — this predates the state machine and isn't part of it; it
   * remains the Admin's own "take this down" action from any state,
   * matching docs/roles-and-permissions.md §2's "unpublish any course"
   * capability for a `published` course, and "remove a bad draft" for
   * any other.
   */
  async archive(id: string, expectedUpdatedAt?: string): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      return transitionStatus(id, "archived", expectedUpdatedAt, "archive", user.id);
    });
  },

  /** Restores an archived course back to `draft` — never straight back to
   *  `published`, so re-publishing is always a deliberate, separate
   *  decision (through `approve` below). */
  async restore(id: string, expectedUpdatedAt?: string): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      return transitionStatus(id, "draft", expectedUpdatedAt, "restore", user.id);
    });
  },

  /**
   * The course state machine's instructor-facing transition (Phase 6,
   * Step 6.2): `draft -> in_review`. Takes an explicit `actingUser`
   * rather than reusing `requireCourseManagementAccess()` internally —
   * unlike every other method on this service, this one has a real
   * non-Admin caller: the course's own instructor. An Admin/Super Admin
   * may also call it directly (the same broad authority they already
   * have over every other course field), so there's still exactly one
   * `submitForReview` implementation Course Builder's own "Submit for
   * Review" button (a later step) will call — not a separate instructor-
   * only code path duplicating this one.
   */
  async submitForReview(
    actingUser: AuthUser,
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      const course = await CourseRepository.findById(id);
      if (!course) {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      if (course.status !== "draft") {
        return { success: false, code: "conflict", message: "Only a draft course can be submitted for review." };
      }

      if (!isRoleAllowed(actingUser.role, ["admin", "super_admin"])) {
        const owns = await ownsCourse(actingUser, course);
        if (!owns) {
          return { success: false, code: "forbidden", message: "You can only submit your own courses for review." };
        }
      }

      const result = await transitionStatus(id, "in_review", expectedUpdatedAt, "submitted_for_review", actingUser.id);
      if (result.success) {
        const adminUserIds = await ProfileService.listAdminUserIds();
        const content = await buildNotificationContent("courseSubmitted", { courseTitle: result.data.title });
        await notifyMany(
          adminUserIds.map((recipientUserId) => ({
            recipientUserId,
            type: "course_submitted",
            ...content,
            data: { courseId: result.data.id, courseSlug: result.data.slug },
          })),
        );
      }
      return result;
    });
  },

  /** Admin/Super-Admin-only: `in_review -> published`, matching
   *  docs/roles-and-permissions.md §2's "Approve... any course." */
  async approve(actingUser: AuthUser, id: string, expectedUpdatedAt?: string): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      if (!isRoleAllowed(actingUser.role, ["admin", "super_admin"])) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const course = await CourseRepository.findById(id);
      if (!course) {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      if (course.status !== "in_review") {
        return { success: false, code: "conflict", message: "Only a course in review can be approved." };
      }
      const result = await transitionStatus(id, "published", expectedUpdatedAt, "approved", actingUser.id);
      if (result.success) {
        await notifyCourseOwner(result.data, "course_approved", "courseApproved");
      }
      return result;
    });
  },

  /** Admin/Super-Admin-only: `in_review -> draft` — sends the course back
   *  for revision rather than deleting/archiving it, matching
   *  `InstructorApplicationService.reject`'s (Step 6.1) "reversible
   *  decision, not a destructive one" precedent. */
  async reject(actingUser: AuthUser, id: string, expectedUpdatedAt?: string): Promise<CourseActionResult<Course>> {
    return safeMutation(async () => {
      if (!isRoleAllowed(actingUser.role, ["admin", "super_admin"])) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const course = await CourseRepository.findById(id);
      if (!course) {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      if (course.status !== "in_review") {
        return { success: false, code: "conflict", message: "Only a course in review can be rejected." };
      }
      const result = await transitionStatus(id, "draft", expectedUpdatedAt, "rejected", actingUser.id);
      if (result.success) {
        await notifyCourseOwner(result.data, "course_rejected", "courseRejected");
      }
      return result;
    });
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
