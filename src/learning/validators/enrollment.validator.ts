import { z } from "zod";
import { ENROLLMENT_SOURCES } from "@/learning/types/enrollment-source";
import { ENROLLMENT_STATUSES } from "@/learning/types/enrollment-status";
import { ENROLLMENT_SORT_FIELDS, ENROLLMENT_SORT_DIRECTIONS } from "@/learning/types/enrollment-search";

/** No `update` schema — see `EnrollmentRepository`'s doc comment for why
 *  (`source`/`grantedByUserId` aren't edited; `status` changes only via
 *  `revokeEnrollmentAction`/`restoreEnrollmentAction`). */
export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  source: z.enum(ENROLLMENT_SOURCES).default("manual_grant"),
});
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

/**
 * `CreateEnrollmentForm`'s own client-side resolver — `source`'s
 * `.default("manual_grant")` on `createEnrollmentSchema` makes it
 * optional at that schema's Zod *input* type while `z.infer` reports the
 * *output* type as required, a mismatch `zodResolver` can't reconcile
 * against a `useForm` generic that always supplies a concrete value
 * (`courseFormSchema` in `courses/validators/course.validator.ts` hit
 * the exact same issue — see its doc comment for the full explanation).
 * `createEnrollmentAction` still validates against `createEnrollmentSchema`
 * server-side.
 */
export const enrollmentFormSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  source: z.enum(ENROLLMENT_SOURCES),
});
export type EnrollmentFormValues = z.infer<typeof enrollmentFormSchema>;

/**
 * Parses the admin Enrollment Management listing's URL search params
 * (Step 4.2) — every field optional and defensively coerced, mirroring
 * `courses/validators/course.validator.ts`'s `searchCoursesSchema`
 * exactly: a malformed or missing param degrades to "no filter"/"use the
 * default" rather than throwing.
 */
export const searchEnrollmentsSchema = z.object({
  query: z.string().trim().min(1).optional(),
  studentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  sortBy: z.enum(ENROLLMENT_SORT_FIELDS).optional(),
  sortDirection: z.enum(ENROLLMENT_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchEnrollmentsInput = z.infer<typeof searchEnrollmentsSchema>;
