import { getDb, type DbClient } from "@/db";
import { instructorProfileAuditLogs } from "@/db/schema/instructor";
import type {
  InstructorProfileAuditLogEntry,
  NewInstructorProfileAuditLogInput,
} from "@/instructor/types/instructor-profile-audit-log";

type InstructorProfileAuditLogRow = typeof instructorProfileAuditLogs.$inferSelect;

function mapRowToEntry(row: InstructorProfileAuditLogRow): InstructorProfileAuditLogEntry {
  return {
    id: row.id,
    action: row.action as InstructorProfileAuditLogEntry["action"],
    instructorProfileId: row.instructorProfileId,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

/** Data access for `instructor_profile_audit_logs` — write-only, mirrors
 *  `CouponAuditLogRepository` exactly. */
export const InstructorProfileAuditLogRepository = {
  async create(
    input: NewInstructorProfileAuditLogInput,
    db: DbClient = getDb(),
  ): Promise<InstructorProfileAuditLogEntry> {
    const [row] = await db
      .insert(instructorProfileAuditLogs)
      .values({
        action: input.action,
        instructorProfileId: input.instructorProfileId,
        actorId: input.actorId,
        metadata: input.metadata ?? {},
      })
      .returning();
    return mapRowToEntry(row);
  },
};
