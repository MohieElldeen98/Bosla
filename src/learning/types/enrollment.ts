import type { EnrollmentSource } from "@/learning/types/enrollment-source";

/** Mirrors `db/schema/learning.ts`'s `enrollments` table. */
export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  source: EnrollmentSource;
  grantedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewEnrollmentInput {
  studentId: string;
  courseId: string;
  source?: EnrollmentSource;
  grantedByUserId?: string | null;
}
