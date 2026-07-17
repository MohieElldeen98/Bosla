import { and, asc, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, courses, instructors, specialties } from "@/db/schema/course";
import type { LocalizedText } from "@/types/i18n";
import type { Course, NewCourseInput } from "@/courses/types/course";
import type { CourseLanguage } from "@/courses/types/course-language";
import type { CourseLevel } from "@/courses/types/course-level";
import type { CourseStatus } from "@/courses/types/course-status";
import {
  DEFAULT_COURSE_SORT_FIELD,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  type CourseSearchFilters,
  type CourseSearchResult,
} from "@/courses/types/course-search";
import type { OptimisticUpdateResult } from "@/courses/types/repository-result";

type CourseRow = typeof courses.$inferSelect;

/** Repository-level `update` shape — mirrors `NewCourseInput` but every
 *  field optional; `CourseService` builds this from the already-validated,
 *  already-price-stringified `UpdateCourseInput`. `seoMetaId` is set only
 *  by `CourseService.attachSeoMeta` — it's never part of the Course
 *  Editor's own form submission. */
export interface UpdateCourseRow {
  slug?: string;
  title?: LocalizedText;
  subtitle?: LocalizedText | null;
  description?: LocalizedText;
  shortDescription?: LocalizedText | null;
  specialtyId?: string;
  categoryId?: string | null;
  instructorId?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  language?: CourseLanguage;
  price?: string;
  originalPrice?: string | null;
  currency?: string;
  isFree?: boolean;
  estimatedDurationMinutes?: number | null;
  certificateAvailable?: boolean;
  featured?: boolean;
  requirements?: LocalizedText[];
  learningObjectives?: LocalizedText[];
  targetAudience?: LocalizedText[];
  coverImageId?: string | null;
  thumbnailId?: string | null;
  trailerVideoId?: string | null;
  seoMetaId?: string | null;
}

const SORT_COLUMNS = {
  updatedAt: courses.updatedAt,
  createdAt: courses.createdAt,
  slug: courses.slug,
  price: courses.price,
  estimatedDurationMinutes: courses.estimatedDurationMinutes,
  status: courses.status,
} as const;

function mapRowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title as LocalizedText,
    subtitle: row.subtitle as LocalizedText | null,
    description: row.description as LocalizedText,
    shortDescription: row.shortDescription as LocalizedText | null,
    specialtyId: row.specialtyId,
    categoryId: row.categoryId,
    instructorId: row.instructorId,
    level: row.level,
    status: row.status,
    language: row.language,
    price: row.price,
    originalPrice: row.originalPrice,
    currency: row.currency,
    isFree: row.isFree,
    estimatedDurationMinutes: row.estimatedDurationMinutes,
    certificateAvailable: row.certificateAvailable,
    featured: row.featured,
    requirements: row.requirements as LocalizedText[],
    learningObjectives: row.learningObjectives as LocalizedText[],
    targetAudience: row.targetAudience as LocalizedText[],
    coverImageId: row.coverImageId,
    thumbnailId: row.thumbnailId,
    trailerVideoId: row.trailerVideoId,
    seoMetaId: row.seoMetaId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `courses`. `CourseService` is the only caller. */
export const CourseRepository = {
  /** Explicitly sets `updatedAt: new Date()` rather than relying on the
   *  column's `now()` default — Postgres's `now()` has microsecond
   *  precision, but a JS `Date` (what every caller's `expectedUpdatedAt`
   *  round-trips through, e.g. the Course Editor's optimistic-concurrency
   *  baseline) only preserves milliseconds. Relying on the DB default here
   *  meant the very first concurrency-checked `update()` after `create()`
   *  would spuriously report `"conflict"` even with no actual conflict —
   *  found and fixed via this step's own verification (Step 3.3). */
  async create(input: NewCourseInput): Promise<Course> {
    const [row] = await getDb()
      .insert(courses)
      .values({
        slug: input.slug,
        title: input.title,
        updatedAt: new Date(),
        subtitle: input.subtitle ?? null,
        description: input.description,
        shortDescription: input.shortDescription ?? null,
        specialtyId: input.specialtyId,
        categoryId: input.categoryId ?? null,
        instructorId: input.instructorId,
        level: input.level,
        status: input.status,
        language: input.language,
        price: input.price,
        originalPrice: input.originalPrice ?? null,
        currency: input.currency,
        isFree: input.isFree,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
        certificateAvailable: input.certificateAvailable,
        featured: input.featured,
        requirements: input.requirements ?? [],
        learningObjectives: input.learningObjectives ?? [],
        targetAudience: input.targetAudience ?? [],
        coverImageId: input.coverImageId ?? null,
        thumbnailId: input.thumbnailId ?? null,
        trailerVideoId: input.trailerVideoId ?? null,
        seoMetaId: input.seoMetaId ?? null,
      })
      .returning();
    return mapRowToCourse(row);
  },

  async findById(id: string): Promise<Course | null> {
    const [row] = await getDb().select().from(courses).where(eq(courses.id, id)).limit(1);
    return row ? mapRowToCourse(row) : null;
  },

  /** Batch lookup — for resolving course titles for a page of rows that
   *  reference courses (e.g. the admin Enrollment listing, Step 4.2)
   *  without an N+1 query, matching `SpecialtyRepository.findByIds`'s
   *  established pattern. */
  async findByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return [];
    const rows = await getDb().select().from(courses).where(inArray(courses.id, ids));
    return rows.map(mapRowToCourse);
  },

  async findBySlug(slug: string): Promise<Course | null> {
    const [row] = await getDb().select().from(courses).where(eq(courses.slug, slug)).limit(1);
    return row ? mapRowToCourse(row) : null;
  },

  /** Newest first — the same order an admin catalog list would default to. */
  async findAll(): Promise<Course[]> {
    const rows = await getDb().select().from(courses).orderBy(desc(courses.createdAt));
    return rows.map(mapRowToCourse);
  },

  async findBySpecialtyId(specialtyId: string): Promise<Course[]> {
    const rows = await getDb()
      .select()
      .from(courses)
      .where(eq(courses.specialtyId, specialtyId))
      .orderBy(desc(courses.createdAt));
    return rows.map(mapRowToCourse);
  },

  async findByInstructorId(instructorId: string): Promise<Course[]> {
    const rows = await getDb()
      .select()
      .from(courses)
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(courses.createdAt));
    return rows.map(mapRowToCourse);
  },

  /** `status = "published"` only. Superseded by `search()` (with
   *  `status: "published", onlyActive: true`) for the actual public
   *  catalog (Step 3.4), which also paginates/filters/sorts; kept as-is
   *  since nothing currently calls this. Newest first, like `findAll` —
   *  `title` is jsonb (bilingual), so it isn't a meaningful `ORDER BY`
   *  target without first picking a locale, which is a Service-layer
   *  concern, not this repository's. */
  async findPublished(): Promise<Course[]> {
    const rows = await getDb()
      .select()
      .from(courses)
      .where(eq(courses.status, "published"))
      .orderBy(desc(courses.createdAt));
    return rows.map(mapRowToCourse);
  },

  /** Server-side pagination/search/filter/sort — the admin course
   *  listing's data source (Step 3.2) and, with `status: "published"` and
   *  `onlyActive: true`, the public catalog's too (Step 3.4; see
   *  `CourseSearchFilters.onlyActive`'s doc comment for why that flag
   *  defaults off). `query` matches `slug` or either locale of `title` —
   *  a raw jsonb `->>` extraction, since Postgres can't `ILIKE` a jsonb
   *  column directly. Runs the page query and the total count in
   *  parallel against the same `WHERE` clause. */
  async search(filters: CourseSearchFilters): Promise<CourseSearchResult<Course>> {
    const conditions: SQL[] = [];

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(courses.slug, pattern),
          ilike(sql`${courses.title}->>'en'`, pattern),
          ilike(sql`${courses.title}->>'ar'`, pattern),
        ) as SQL,
      );
    }
    if (filters.status) conditions.push(eq(courses.status, filters.status));
    if (filters.specialtyId) conditions.push(eq(courses.specialtyId, filters.specialtyId));
    if (filters.categoryId) conditions.push(eq(courses.categoryId, filters.categoryId));
    if (filters.instructorId) conditions.push(eq(courses.instructorId, filters.instructorId));
    if (filters.language) conditions.push(eq(courses.language, filters.language));
    if (filters.level) conditions.push(eq(courses.level, filters.level));
    if (filters.isFree !== undefined) conditions.push(eq(courses.isFree, filters.isFree));
    if (filters.featured !== undefined) conditions.push(eq(courses.featured, filters.featured));

    if (filters.onlyActive) {
      conditions.push(
        exists(
          getDb()
            .select({ one: sql`1` })
            .from(specialties)
            .where(and(eq(specialties.id, courses.specialtyId), eq(specialties.isActive, true))),
        ),
      );
      conditions.push(
        exists(
          getDb()
            .select({ one: sql`1` })
            .from(instructors)
            .where(and(eq(instructors.id, courses.instructorId), eq(instructors.isActive, true))),
        ),
      );
      conditions.push(
        or(
          sql`${courses.categoryId} IS NULL`,
          exists(
            getDb()
              .select({ one: sql`1` })
              .from(categories)
              .where(and(eq(categories.id, courses.categoryId), eq(categories.isActive, true))),
          ),
        ) as SQL,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_COURSE_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_SORT_DIRECTION) === "asc" ? asc : desc;
    const durationSort = filters.sortBy === "estimatedDurationMinutes";
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(courses)
        .where(whereClause)
        .orderBy(
          ...(durationSort
            ? [sql`${courses.estimatedDurationMinutes} IS NULL`, orderFn(courses.estimatedDurationMinutes)]
            : [orderFn(sortColumn)]),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(courses)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToCourse),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** `expectedUpdatedAt`, when given, is included in the `WHERE` clause so
   *  the update itself is the atomic check-and-write — no separate
   *  read-then-write race window (Step 3.3 — mirrors
   *  `CmsSeoRepository.update` exactly). If the row exists but the
   *  timestamp didn't match (someone else saved it first), a follow-up
   *  existence check distinguishes that from "no such row" so the caller
   *  gets the right `CourseActionResult` code. */
  async update(
    id: string,
    input: UpdateCourseRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Course>> {
    const conditions = [eq(courses.id, id)];
    if (expectedUpdatedAt) {
      conditions.push(eq(courses.updatedAt, new Date(expectedUpdatedAt)));
    }

    const [row] = await getDb()
      .update(courses)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToCourse(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await CourseRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(courses).where(eq(courses.id, id));
  },
};
