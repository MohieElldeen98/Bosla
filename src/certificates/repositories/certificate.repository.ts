import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { certificates } from "@/db/schema/certificates";
import type { Certificate, NewCertificateInput } from "@/certificates/types/certificate";

type CertificateRow = typeof certificates.$inferSelect;

function mapRowToCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    certificateNumber: row.certificateNumber,
    issuedAt: row.issuedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Data access for `certificates`. `CertificateService` is the only
 *  caller — mirrors `payments/repositories/invoice.repository.ts`
 *  exactly. */
export const CertificateRepository = {
  /** The next value of the collision-proof `certificate_number_seq`
   *  Postgres sequence — `CertificateService` formats it into the
   *  public certificate number. */
  async nextSequenceValue(): Promise<number> {
    const rows = await getDb().execute<{ nextval: string | number }>(
      sql`select nextval('certificate_number_seq') as nextval`,
    );
    const value = rows[0]?.nextval;
    if (value === undefined) {
      throw new Error("certificate_number_seq returned no value.");
    }
    return Number(value);
  },

  /** `created: false` when the student already has a certificate for
   *  this course (the unique `(user_id, course_id)` slot) — issuing is
   *  strictly once per student per course. */
  async create(input: NewCertificateInput): Promise<{ created: boolean; certificate: Certificate | null }> {
    const [row] = await getDb()
      .insert(certificates)
      .values({
        userId: input.userId,
        courseId: input.courseId,
        certificateNumber: input.certificateNumber,
      })
      .onConflictDoNothing()
      .returning();
    return row ? { created: true, certificate: mapRowToCertificate(row) } : { created: false, certificate: null };
  },

  async findById(id: string): Promise<Certificate | null> {
    const [row] = await getDb().select().from(certificates).where(eq(certificates.id, id)).limit(1);
    return row ? mapRowToCertificate(row) : null;
  },

  async findByUserAndCourse(userId: string, courseId: string): Promise<Certificate | null> {
    const [row] = await getDb()
      .select()
      .from(certificates)
      .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
      .limit(1);
    return row ? mapRowToCertificate(row) : null;
  },

  async findByUserId(userId: string): Promise<Certificate[]> {
    const rows = await getDb().select().from(certificates).where(eq(certificates.userId, userId));
    return rows.map(mapRowToCertificate);
  },
};
