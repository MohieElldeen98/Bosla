import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import {
  INSTRUCTOR_PROFILE_SORT_DIRECTIONS,
  INSTRUCTOR_PROFILE_SORT_FIELDS,
} from "@/instructor/types/instructor-profile-search";
import { INSTRUCTOR_APPLICATION_STATUSES } from "@/instructor/types/instructor-profile";

/** The "Apply to become an Instructor" form/action — a bilingual
 *  `headline` (e.g. "Licensed Physical Therapist") plus a short free-text
 *  `credentials` field (e.g. "DPT, RD"), matching
 *  docs/database-overview.md §1's illustrative `instructor_profiles`
 *  column list. */
export const applyForInstructorSchema = z.object({
  headline: localizedTextSchema,
  credentials: z.string().trim().max(200).optional(),
});
export type ApplyForInstructorInput = z.infer<typeof applyForInstructorSchema>;

/** Parses the admin Instructor Applications listing's URL search params. */
export const searchInstructorApplicationsSchema = z.object({
  query: z.string().trim().min(1).optional(),
  status: z.enum(INSTRUCTOR_APPLICATION_STATUSES).optional(),
  sortBy: z.enum(INSTRUCTOR_PROFILE_SORT_FIELDS).optional(),
  sortDirection: z.enum(INSTRUCTOR_PROFILE_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchInstructorApplicationsInput = z.infer<typeof searchInstructorApplicationsSchema>;
