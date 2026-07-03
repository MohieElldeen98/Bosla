/** Mirrors `db/schema/learning.ts`'s `enrollment_source` Postgres enum
 *  exactly. `purchase` (Commerce, Phase 5, Step 5.1) covers both a
 *  simulated-paid checkout and a $0 checkout (free course, or a
 *  100%-off coupon) — both go through the same `OrderService.markPaid`
 *  completion path, so they share one source value. */
export const ENROLLMENT_SOURCES = ["manual_grant", "purchase"] as const;
export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number];
export const DEFAULT_ENROLLMENT_SOURCE: EnrollmentSource = "manual_grant";
export function isEnrollmentSource(value: unknown): value is EnrollmentSource {
  return typeof value === "string" && (ENROLLMENT_SOURCES as readonly string[]).includes(value);
}
