import { z } from "zod";
import { ENROLLMENT_SOURCES } from "@/learning/types/enrollment-source";

/** No `update` schema — see `EnrollmentRepository`'s doc comment for why
 *  (a grant isn't edited, it's revoked and re-granted). */
export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  source: z.enum(ENROLLMENT_SOURCES).default("manual_grant"),
});
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
