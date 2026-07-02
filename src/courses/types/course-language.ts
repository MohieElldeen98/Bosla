/**
 * Which language(s) a course's lesson content is delivered in — distinct
 * from the site's own bilingual UI. Mirrors `db/schema/course.ts`'s
 * `course_language` Postgres enum exactly.
 */
export const COURSE_LANGUAGES = ["en", "ar", "both"] as const;
export type CourseLanguage = (typeof COURSE_LANGUAGES)[number];
export const DEFAULT_COURSE_LANGUAGE: CourseLanguage = "en";
export function isCourseLanguage(value: unknown): value is CourseLanguage {
  return typeof value === "string" && (COURSE_LANGUAGES as readonly string[]).includes(value);
}
