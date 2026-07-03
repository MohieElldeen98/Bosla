import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { lessons } from "@/db/schema/learning";
import type { LocalizedText } from "@/types/i18n";
import type { Lesson, NewLessonInput } from "@/learning/types/lesson";
import type { LessonType } from "@/learning/types/lesson-type";
import type { OptimisticUpdateResult } from "@/learning/types/repository-result";

type LessonRow = typeof lessons.$inferSelect;

export interface UpdateLessonRow {
  title?: LocalizedText;
  position?: number;
  type?: LessonType;
  videoAssetId?: string | null;
  body?: LocalizedText | null;
  durationSeconds?: number | null;
  isPreview?: boolean;
}

function mapRowToLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    moduleId: row.moduleId,
    title: row.title as LocalizedText,
    position: row.position,
    type: row.type,
    videoAssetId: row.videoAssetId,
    body: row.body as LocalizedText | null,
    durationSeconds: row.durationSeconds,
    isPreview: row.isPreview,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `lessons`. `LessonService` is the only caller. */
export const LessonRepository = {
  async create(input: NewLessonInput): Promise<Lesson> {
    const [row] = await getDb()
      .insert(lessons)
      .values({
        moduleId: input.moduleId,
        title: input.title,
        position: input.position ?? 0,
        type: input.type,
        videoAssetId: input.videoAssetId ?? null,
        body: input.body ?? null,
        durationSeconds: input.durationSeconds ?? null,
        isPreview: input.isPreview,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToLesson(row);
  },

  async findById(id: string): Promise<Lesson | null> {
    const [row] = await getDb().select().from(lessons).where(eq(lessons.id, id)).limit(1);
    return row ? mapRowToLesson(row) : null;
  },

  async findByModuleId(moduleId: string): Promise<Lesson[]> {
    const rows = await getDb()
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.position));
    return rows.map(mapRowToLesson);
  },

  /** Batch lookup — for computing per-course progress (the Student
   *  Dashboard, Step 4.3) without an N+1 query, same reasoning as
   *  `ModuleRepository.findByCourseIds`. */
  async findByModuleIds(moduleIds: string[]): Promise<Lesson[]> {
    if (moduleIds.length === 0) return [];
    const rows = await getDb().select().from(lessons).where(inArray(lessons.moduleId, moduleIds));
    return rows.map(mapRowToLesson);
  },

  /** Same optimistic-concurrency shape as `ModuleRepository.update` /
   *  `CourseRepository.update` — see either's doc comment. */
  async update(
    id: string,
    input: UpdateLessonRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Lesson>> {
    const conditions = [eq(lessons.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(lessons.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(lessons)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToLesson(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await LessonRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(lessons).where(eq(lessons.id, id));
  },
};
