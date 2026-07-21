import { sql } from "drizzle-orm";
import { pgSequence, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";
import { courses } from "./course";

/**
 * The Certificates Domain (Learner Workspace) — one row per
 * student-completed course that offers a certificate
 * (`courses.certificateAvailable`). Mirrors `payments.ts`'s `invoices`
 * table exactly: a collision-proof Postgres sequence backs the public
 * `certificateNumber` (`CERT-<year>-<seq>`, same reasoning as
 * `invoice_number_seq`), and the PDF is rendered on demand from this
 * row (`/api/certificates/[certificateId]/pdf`), never stored — nothing
 * else about a certificate changes after issuance, so regenerating the
 * PDF from the row is always correct and costs nothing.
 */
export const certificateNumberSeq = pgSequence("certificate_number_seq", { startWith: 1000, increment: 1 });

/** Issued exactly once per `(userId, courseId)` — the unique index is
 *  the idempotency guarantee `CertificateService.issueIfEligible` relies
 *  on (mirrors `invoices.orderId`'s unique slot): whoever loses the
 *  race on course-completion simply reads the winner's row. */
export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    certificateNumber: text("certificate_number").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("certificates_user_course_key").on(table.userId, table.courseId),
    uniqueIndex("certificates_certificate_number_key").on(table.certificateNumber),
  ],
);
