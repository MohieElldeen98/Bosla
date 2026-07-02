import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { courses } from "@/db/schema/course";
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

type CourseRow = typeof courses.$inferSelect;

/** Repository-level `update` shape — mirrors `NewCourseInput` but every
 *  field optional; `CourseService` builds this from the already-validated,
 *  already-price-stringified `UpdateCourseInput`. */
export interface UpdateCourseRow {
  slug?: string;
  title?: LocalizedText;
  description?: LocalizedText;
  specialtyId?: string;
  categoryId?: string | null;
  instructorId?: string;
  level?: CourseLevel;
  status?: CourseStatus;
  language?: CourseLanguage;
  price?: string;
  originalPrice?: string | null;
  currency?: string;
  coverImageId?: string | null;
}

const SORT_COLUMNS = {
  updatedAt: courses.updatedAt,
  createdAt: courses.createdAt,
  slug: courses.slug,
  price: courses.price,
  status: courses.status,
} as const;

function mapRowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title as LocalizedText,
    description: row.description as LocalizedText,
    specialtyId: row.specialtyId,
    categoryId: row.categoryId,
    instructorId: row.instructorId,
    level: row.level,
    status: row.status,
    language: row.language,
    price: row.price,
    originalPrice: row.originalPrice,
    currency: row.currency,
    coverImageId: row.coverImageId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `courses`. `CourseService` is the only caller. */
export const CourseRepository = {
  async create(input: NewCourseInput): Promise<Course> {
    const [row] = await getDb()
      .insert(courses)
      .values({
        slug: input.slug,
        title: input.title,
        description: input.description,
        specialtyId: input.specialtyId,
        categoryId: input.categoryId ?? null,
        instructorId: input.instructorId,
        level: input.level,
        status: input.status,
        language: input.language,
        price: input.price,
        originalPrice: input.originalPrice ?? null,
        currency: input.currency,
        coverImageId: input.coverImageId ?? null,
      })
      .returning();
    return mapRowToCourse(row);
  },

  async findById(id: string): Promise<Course | null> {
    const [row] = await getDb().select().from(courses).where(eq(courses.id, id)).limit(1);
    return row ? mapRowToCourse(row) : null;
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

  /** `status = "published"` only — what a future public catalog reads.
   *  Newest first, like `findAll` — `title` is jsonb (bilingual), so it
   *  isn't a meaningful `ORDER BY` target without first picking a locale,
   *  which is a Service-layer concern, not this repository's. */
  async findPublished(): Promise<Course[]> {
    const rows = await getDb()
      .select()
      .from(courses)
      .where(eq(courses.status, "published"))
      .orderBy(desc(courses.createdAt));
    return rows.map(mapRowToCourse);
  },

  /** Server-side pagination/search/filter/sort for the admin course
   *  listing (Step 3.2). `query` matches `slug` or either locale of
   *  `title` — a raw jsonb `->>` extraction, since Postgres can't `ILIKE`
   *  a jsonb column directly. Runs the page query and the total count in
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_COURSE_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(courses)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
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

  async update(id: string, input: UpdateCourseRow): Promise<Course | null> {
    const [row] = await getDb()
      .update(courses)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return row ? mapRowToCourse(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(courses).where(eq(courses.id, id));
  },
};
