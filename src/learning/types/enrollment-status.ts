/** Mirrors `db/schema/learning.ts`'s `enrollment_status` Postgres enum
 *  exactly. Added Step 4.2 — see that schema's doc comment. */
export const ENROLLMENT_STATUSES = ["active", "revoked"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];
export const DEFAULT_ENROLLMENT_STATUS: EnrollmentStatus = "active";
export function isEnrollmentStatus(value: unknown): value is EnrollmentStatus {
  return typeof value === "string" && (ENROLLMENT_STATUSES as readonly string[]).includes(value);
}
