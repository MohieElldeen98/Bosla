/** Mirrors `db/schema/learning.ts`'s `lesson_type` Postgres enum exactly. */
export const LESSON_TYPES = ["video", "reading", "quiz"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];
export const DEFAULT_LESSON_TYPE: LessonType = "video";
export function isLessonType(value: unknown): value is LessonType {
  return typeof value === "string" && (LESSON_TYPES as readonly string[]).includes(value);
}
