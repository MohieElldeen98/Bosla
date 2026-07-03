/** Mirrors `db/schema/instructor.ts`'s `instructor_profile_audit_logs`
 *  table — write-only, same shape as `commerce/types/coupon-audit-log.ts`'s
 *  `CouponAuditLogEntry`. */
export type InstructorProfileAuditLogAction =
  | "application_submitted"
  | "application_approved"
  | "application_rejected";

export interface InstructorProfileAuditLogEntry {
  id: string;
  action: InstructorProfileAuditLogAction;
  instructorProfileId: string;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface NewInstructorProfileAuditLogInput {
  action: InstructorProfileAuditLogAction;
  instructorProfileId: string;
  actorId: string | null;
  metadata?: Record<string, unknown>;
}
