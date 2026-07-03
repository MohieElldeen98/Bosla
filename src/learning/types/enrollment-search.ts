import type { EnrollmentSource } from "@/learning/types/enrollment-source";
import type { EnrollmentStatus } from "@/learning/types/enrollment-status";

/** Columns the admin enrollment listing (Step 4.2) can sort by — mirrors
 *  `courses/types/course-search.ts`'s `COURSE_SORT_FIELDS` shape. */
export const ENROLLMENT_SORT_FIELDS = ["createdAt", "updatedAt"] as const;
export type EnrollmentSortField = (typeof ENROLLMENT_SORT_FIELDS)[number];
export const DEFAULT_ENROLLMENT_SORT_FIELD: EnrollmentSortField = "createdAt";

export const ENROLLMENT_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type EnrollmentSortDirection = (typeof ENROLLMENT_SORT_DIRECTIONS)[number];
export const DEFAULT_ENROLLMENT_SORT_DIRECTION: EnrollmentSortDirection = "desc";

export const DEFAULT_ENROLLMENT_PAGE_SIZE = 20;

export interface EnrollmentSearchFilters {
  /** Free-text — matches student name/email or course title, via `EXISTS`
   *  subqueries against `profiles`/`courses` (no cross-domain SQL join,
   *  same pattern `CourseRepository.search`'s `onlyActive` established). */
  query?: string;
  studentId?: string;
  courseId?: string;
  status?: EnrollmentStatus;
  sortBy?: EnrollmentSortField;
  sortDirection?: EnrollmentSortDirection;
  page?: number;
  pageSize?: number;
}

/** Mirrors `courses/types/course-search.ts`'s `CourseSearchResult<T>` —
 *  same shape, own copy per this codebase's per-domain convention. */
export interface EnrollmentSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * The admin enrollment listing's display-ready row shape — an
 * `Enrollment` plus the student/course/granted-by names resolved,
 * composed at the Service layer from parallel repository reads (the same
 * "no cross-domain SQL joins, compose in the service" pattern
 * `CourseService.searchResolved` already established).
 */
export interface EnrollmentListItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  source: EnrollmentSource;
  status: EnrollmentStatus;
  grantedByUserId: string | null;
  grantedByName: string | null;
  createdAt: string;
  updatedAt: string;
}
