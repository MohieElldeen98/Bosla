/** Mirrors `db/schema/course.ts`'s `course_level` Postgres enum exactly. */
export const COURSE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];
export const DEFAULT_COURSE_LEVEL: CourseLevel = "beginner";
export function isCourseLevel(value: unknown): value is CourseLevel {
  return typeof value === "string" && (COURSE_LEVELS as readonly string[]).includes(value);
}
