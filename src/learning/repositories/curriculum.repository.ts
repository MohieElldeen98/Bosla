import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { lessons, modules } from "@/db/schema/learning";
import type { Locale } from "@/i18n/routing";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { CurriculumTree } from "@/learning/types/curriculum-tree";

/** Batch aggregates used when composing catalog rows; one grouped query covers the page. */
export const CurriculumRepository = {
  /** Reads a course tree in two batched queries so public composition never
   * exposes non-preview media and never performs one query per lesson. */
  async findMarketingTree(courseId: string, locale: Locale): Promise<{
    tree: CurriculumTree;
    videoAssetIds: Record<string, string>;
  }> {
    const moduleRows = await getDb()
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.position));
    const moduleIds = moduleRows.map((module) => module.id);
    const lessonRows = moduleIds.length === 0
      ? []
      : await getDb()
          .select()
          .from(lessons)
          .where(inArray(lessons.moduleId, moduleIds))
          .orderBy(asc(lessons.position));
    const videoAssetIds: Record<string, string> = {};
    const curriculumModules = moduleRows.map((module) => {
      const moduleLessons = lessonRows.filter((lesson) => lesson.moduleId === module.id);
      return {
        id: module.id,
        title: resolveLocalizedText(module.title as { en: string; ar: string }, locale),
        position: module.position,
        lessons: moduleLessons.map((lesson) => {
          if (lesson.isPreview && lesson.videoAssetId) videoAssetIds[lesson.id] = lesson.videoAssetId;
          return {
            id: lesson.id,
            title: resolveLocalizedText(lesson.title as { en: string; ar: string }, locale),
            position: lesson.position,
            durationSeconds: lesson.durationSeconds,
            kind: (lesson.type === "reading" ? "text" : lesson.type) as "video" | "text" | "quiz",
            isPreview: lesson.isPreview,
            state: (lesson.isPreview ? "available" : "locked") as "available" | "locked",
          };
        }),
        lessonCount: moduleLessons.length,
        totalDurationSeconds: moduleLessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0),
      };
    });
    return {
      tree: {
        modules: curriculumModules,
        moduleCount: curriculumModules.length,
        lessonCount: curriculumModules.reduce((total, module) => total + module.lessonCount, 0),
        totalDurationSeconds: curriculumModules.reduce((total, module) => total + module.totalDurationSeconds, 0),
      },
      videoAssetIds,
    };
  },
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
