/**
 * Mirrors `db/schema/course.ts`'s `course_status` Postgres enum exactly.
 * The state machine itself (`draft -> in_review -> published -> archived`,
 * who can transition a course between these) is Phase 6 scope
 * (docs/roadmap.md) — this step only stores/validates the value.
 */
export const COURSE_STATUSES = ["draft", "in_review", "published", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export const DEFAULT_COURSE_STATUS: CourseStatus = "draft";
export function isCourseStatus(value: unknown): value is CourseStatus {
  return typeof value === "string" && (COURSE_STATUSES as readonly string[]).includes(value);
}
