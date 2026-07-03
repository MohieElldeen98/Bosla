/** Mirrors `db/schema/learning.ts`'s `enrollment_source` Postgres enum
 *  exactly. Only `manual_grant` today — see that schema's doc comment for
 *  why a `purchase` source isn't added speculatively ahead of Commerce
 *  (Phase 5). */
export const ENROLLMENT_SOURCES = ["manual_grant"] as const;
export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number];
export const DEFAULT_ENROLLMENT_SOURCE: EnrollmentSource = "manual_grant";
export function isEnrollmentSource(value: unknown): value is EnrollmentSource {
  return typeof value === "string" && (ENROLLMENT_SOURCES as readonly string[]).includes(value);
}
