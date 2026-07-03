import type { InstructorApplicationStatus } from "@/instructor/types/instructor-profile";

/** Columns the admin Instructor Applications listing can sort by —
 *  mirrors `commerce/types/order-search.ts`'s `ORDER_SORT_FIELDS` shape. */
export const INSTRUCTOR_PROFILE_SORT_FIELDS = ["createdAt", "updatedAt"] as const;
export type InstructorProfileSortField = (typeof INSTRUCTOR_PROFILE_SORT_FIELDS)[number];
export const DEFAULT_INSTRUCTOR_PROFILE_SORT_FIELD: InstructorProfileSortField = "createdAt";

export const INSTRUCTOR_PROFILE_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type InstructorProfileSortDirection = (typeof INSTRUCTOR_PROFILE_SORT_DIRECTIONS)[number];
export const DEFAULT_INSTRUCTOR_PROFILE_SORT_DIRECTION: InstructorProfileSortDirection = "desc";

export const DEFAULT_INSTRUCTOR_PROFILE_PAGE_SIZE = 20;

export interface InstructorProfileSearchFilters {
  /** Free-text — matches the applicant's name/email via an `EXISTS`
   *  subquery against `profiles`, same pattern
   *  `EnrollmentRepository.search`'s own `query` filter established. */
  query?: string;
  status?: InstructorApplicationStatus;
  sortBy?: InstructorProfileSortField;
  sortDirection?: InstructorProfileSortDirection;
  page?: number;
  pageSize?: number;
}

/** Mirrors `commerce/types/order-search.ts`'s `OrderSearchResult<T>` —
 *  same shape, own copy per this codebase's per-domain convention. */
export interface InstructorProfileSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** The admin Instructor Applications listing's display-ready row shape —
 *  an `InstructorProfile` plus the applicant's name/email resolved,
 *  composed at the Service layer from parallel repository reads (the
 *  same "no cross-domain SQL joins, compose in the service" pattern
 *  `EnrollmentService.searchResolved` established). */
export interface InstructorProfileListItem {
  id: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  headline: string;
  credentials: string | null;
  status: InstructorApplicationStatus;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
