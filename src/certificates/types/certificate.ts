/** Mirrors `db/schema/certificates.ts`'s `certificates` table — issued
 *  exactly once per `(userId, courseId)`. */
export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  createdAt: string;
}

export interface NewCertificateInput {
  userId: string;
  courseId: string;
  certificateNumber: string;
}
