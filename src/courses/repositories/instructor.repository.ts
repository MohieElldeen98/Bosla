import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { courses, instructors } from "@/db/schema/course";
import { enrollments } from "@/db/schema/learning";
import type { LocalizedText } from "@/types/i18n";
import type { Instructor, NewInstructorInput } from "@/courses/types/instructor";
import type { OptimisticUpdateResult } from "@/courses/types/repository-result";

type InstructorRow = typeof instructors.$inferSelect;

export interface UpdateInstructorRow {
  slug?: string;
  name?: LocalizedText;
  title?: LocalizedText | null;
  qualification?: LocalizedText | null;
  bio?: LocalizedText | null;
  specialtyId?: string | null;
  experienceYears?: number | null;
  avatarImageId?: string | null;
  publicPortraitImageId?: string | null;
  profileId?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

function mapRowToInstructor(row: InstructorRow): Instructor {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name as LocalizedText,
    title: (row.title as LocalizedText | null) ?? null,
    qualification: (row.qualification as LocalizedText | null) ?? null,
    bio: (row.bio as LocalizedText | null) ?? null,
    specialtyId: row.specialtyId,
    experienceYears: row.experienceYears,
    avatarImageId: row.avatarImageId,
    publicPortraitImageId: row.publicPortraitImageId,
    profileId: row.profileId,
    isFeatured: row.isFeatured,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Data access for `instructors` (course attribution/content data — see
 * `db/schema/course.ts`'s doc comment for how this differs from the
 * mock-backed `InstructorRepository` at `src/repositories/instructor
 * .repository.ts`, which this does NOT replace in this step).
 * `CourseInstructorService` is the only caller.
 */
export const CourseInstructorRepository = {
  async create(input: NewInstructorInput): Promise<Instructor> {
    const [row] = await getDb()
      .insert(instructors)
      .values({
        slug: input.slug,
        name: input.name,
        updatedAt: new Date(),
        title: input.title ?? null,
        qualification: input.qualification ?? null,
        bio: input.bio ?? null,
        specialtyId: input.specialtyId ?? null,
        experienceYears: input.experienceYears ?? null,
        avatarImageId: input.avatarImageId ?? null,
        publicPortraitImageId: input.publicPortraitImageId ?? null,
        profileId: input.profileId ?? null,
        isFeatured: input.isFeatured ?? false,
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();
    return mapRowToInstructor(row);
  },

  async findById(id: string): Promise<Instructor | null> {
    const [row] = await getDb().select().from(instructors).where(eq(instructors.id, id)).limit(1);
    return row ? mapRowToInstructor(row) : null;
  },

  async findBySlug(slug: string): Promise<Instructor | null> {
    const [row] = await getDb().select().from(instructors).where(eq(instructors.slug, slug)).limit(1);
    return row ? mapRowToInstructor(row) : null;
  },

  /** The `profiles.id` bridge (unique index) — resolves a signed-in
   *  Instructor to their own content-attribution row (Phase 6, Step
   *  6.3). `null` for a real signed-in Instructor who hasn't authored a
   *  course yet — the bridge is only created on first course creation
   *  (`CourseService.createOwn`), not eagerly. */
  async findByProfileId(profileId: string): Promise<Instructor | null> {
    const [row] = await getDb().select().from(instructors).where(eq(instructors.profileId, profileId)).limit(1);
    return row ? mapRowToInstructor(row) : null;
  },

  /** Ordered by `displayOrder` ascending. */
  async findAll(): Promise<Instructor[]> {
    const rows = await getDb().select().from(instructors).orderBy(asc(instructors.displayOrder));
    return rows.map(mapRowToInstructor);
  },

  /** Batch lookup — for composing a list of courses with their instructor
   *  names resolved without one query per row (Step 3.2 admin listing). */
  async findByIds(ids: string[]): Promise<Instructor[]> {
    if (ids.length === 0) return [];
    const rows = await getDb().select().from(instructors).where(inArray(instructors.id, ids));
    return rows.map(mapRowToInstructor);
  },

  /** Public-facing selection (homepage Hero, future course cards/instructors
   *  page): featured AND still active — a deactivated instructor must drop
   *  out immediately even if nobody remembered to unfeature them first. */
  async findFeatured(): Promise<Instructor[]> {
    const rows = await getDb()
      .select()
      .from(instructors)
      .where(and(eq(instructors.isFeatured, true), eq(instructors.isActive, true)))
      .orderBy(asc(instructors.displayOrder));
    return rows.map(mapRowToInstructor);
  },

  /** Replaces the entire featured set atomically: instructors dropped from
   *  `orderedIds` are unfeatured, the rest get `displayOrder` 0..N-1 in the
   *  given order. Runs as one transaction so `findFeatured()` never
   *  observes a partial reshuffle, and stages the new order through
   *  negative placeholders first so two featured rows can never collide on
   *  the same `displayOrder` even transiently (a real, not just
   *  final-state, guarantee — matters if a unique constraint is ever added
   *  on top of this later). */
  async setFeatured(orderedIds: string[]): Promise<void> {
    await getDb().transaction(async (tx) => {
      const dropCondition =
        orderedIds.length > 0
          ? and(eq(instructors.isFeatured, true), notInArray(instructors.id, orderedIds))
          : eq(instructors.isFeatured, true);
      await tx.update(instructors).set({ isFeatured: false, updatedAt: new Date() }).where(dropCondition);

      for (const [index, id] of orderedIds.entries()) {
        await tx
          .update(instructors)
          .set({ displayOrder: -(index + 1) })
          .where(eq(instructors.id, id));
      }
      for (const [index, id] of orderedIds.entries()) {
        await tx
          .update(instructors)
          .set({ isFeatured: true, displayOrder: index, updatedAt: new Date() })
          .where(eq(instructors.id, id));
      }
    });
  },

  /** Batched distinct-student count per instructor, joined through their
   *  courses' enrollments — computed, not stored (same reasoning as
   *  `courses`' own doc comment on why aggregate-looking numbers aren't
   *  columns: a manually-typed count would just be fake data). */
  async countEnrolledStudents(instructorIds: string[]): Promise<Record<string, number>> {
    if (instructorIds.length === 0) return {};
    const rows = await getDb()
      .select({
        instructorId: courses.instructorId,
        count: sql<string>`count(distinct ${enrollments.studentId})`,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(inArray(courses.instructorId, instructorIds))
      .groupBy(courses.instructorId);

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.instructorId] = Number(row.count);
    }
    return result;
  },

  /** Same optimistic-concurrency shape as `CourseRepository.update`/
   *  `ModuleRepository.update` — added in Step 6.6 for the Instructor
   *  Profile editor (Own-scoped). The pre-existing Admin `update` caller
   *  (`CourseInstructorService.update`) simply never passes
   *  `expectedUpdatedAt`, matching every other domain's "optional third
   *  argument" convention. */
  async update(
    id: string,
    input: UpdateInstructorRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Instructor>> {
    const conditions = [eq(instructors.id, id)];
    if (expectedUpdatedAt) {
      // Millisecond-truncated comparison — same rationale as
      // `CourseRepository.update`: SQL-seeded rows carry microseconds the
      // JS-Date baseline can't represent.
      conditions.push(
        sql`date_trunc('milliseconds', ${instructors.updatedAt}) = ${new Date(expectedUpdatedAt).toISOString()}::timestamptz`,
      );
    }

    const [row] = await getDb()
      .update(instructors)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToInstructor(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await CourseInstructorRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(instructors).where(eq(instructors.id, id));
  },
};
