import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { instructors } from "@/db/schema/course";
import type { LocalizedText } from "@/types/i18n";
import type { Instructor, NewInstructorInput } from "@/courses/types/instructor";
import type { UpdateInstructorInput } from "@/courses/validators/instructor.validator";

type InstructorRow = typeof instructors.$inferSelect;

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
        title: input.title ?? null,
        qualification: input.qualification ?? null,
        bio: input.bio ?? null,
        specialtyId: input.specialtyId ?? null,
        experienceYears: input.experienceYears ?? null,
        avatarImageId: input.avatarImageId ?? null,
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

  async findFeatured(): Promise<Instructor[]> {
    const rows = await getDb()
      .select()
      .from(instructors)
      .where(eq(instructors.isFeatured, true))
      .orderBy(asc(instructors.displayOrder));
    return rows.map(mapRowToInstructor);
  },

  async update(id: string, input: UpdateInstructorInput): Promise<Instructor | null> {
    const [row] = await getDb()
      .update(instructors)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(instructors.id, id))
      .returning();
    return row ? mapRowToInstructor(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(instructors).where(eq(instructors.id, id));
  },
};
