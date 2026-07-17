import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { lessons, modules } from "@/db/schema/learning";

/** Batch aggregates used when composing catalog rows; one grouped query covers the page. */
export const CurriculumRepository = {
  async countLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>> {
    if (courseIds.length === 0) return new Map();
    const rows = await getDb()
      .select({ courseId: modules.courseId, lessonCount: sql<number>`count(${lessons.id})::int` })
      .from(modules)
      .leftJoin(lessons, eq(lessons.moduleId, modules.id))
      .where(inArray(modules.courseId, courseIds))
      .groupBy(modules.courseId);
    return new Map(rows.map((row) => [row.courseId, row.lessonCount]));
  },
};
