import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { modules } from "@/db/schema/learning";
import type { LocalizedText } from "@/types/i18n";
import type { Module, NewModuleInput } from "@/learning/types/module";
import type { OptimisticUpdateResult } from "@/learning/types/repository-result";

type ModuleRow = typeof modules.$inferSelect;

export interface UpdateModuleRow {
  title?: LocalizedText;
  position?: number;
}

function mapRowToModule(row: ModuleRow): Module {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title as LocalizedText,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `modules`. `ModuleService` is the only caller. */
export const ModuleRepository = {
  async create(input: NewModuleInput): Promise<Module> {
    const [row] = await getDb()
      .insert(modules)
      .values({
        courseId: input.courseId,
        title: input.title,
        position: input.position ?? 0,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToModule(row);
  },

  async findById(id: string): Promise<Module | null> {
    const [row] = await getDb().select().from(modules).where(eq(modules.id, id)).limit(1);
    return row ? mapRowToModule(row) : null;
  },

  /** Ordered by `position` — the sequence a Course Player (later phase)
   *  would present a course's modules in. */
  async findByCourseId(courseId: string): Promise<Module[]> {
    const rows = await getDb()
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.position));
    return rows.map(mapRowToModule);
  },

  /** Batch lookup — for computing per-course progress across a student's
   *  several enrolled courses (the Student Dashboard, Step 4.3) without
   *  an N+1 query, matching `SpecialtyRepository.findByIds`'s established
   *  pattern in the Course Domain. */
  async findByCourseIds(courseIds: string[]): Promise<Module[]> {
    if (courseIds.length === 0) return [];
    const rows = await getDb().select().from(modules).where(inArray(modules.courseId, courseIds));
    return rows.map(mapRowToModule);
  },

  /** `expectedUpdatedAt`, when given, enforces optimistic concurrency the
   *  same way `CourseRepository.update` does — see that repository's doc
   *  comment for the full rationale (including the timestamp-precision
   *  fix this mirrors: `updatedAt` is always explicitly set to a
   *  JS-constructed `Date`, never left to the column's `now()` default,
   *  on both `create` and `update`). */
  async update(
    id: string,
    input: UpdateModuleRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Module>> {
    const conditions = [eq(modules.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(modules.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(modules)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToModule(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await ModuleRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(modules).where(eq(modules.id, id));
  },
};
