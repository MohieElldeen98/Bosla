import type { Role } from "@/auth/types/role";
import type { ProfileStatus } from "@/auth/types/profile-status";

/** Columns the admin Users listing (Phase 7) can sort by — mirrors
 *  `courses/types/course-search.ts`'s `COURSE_SORT_FIELDS` shape. */
export const PROFILE_SORT_FIELDS = ["createdAt", "displayName", "lastLoginAt"] as const;
export type ProfileSortField = (typeof PROFILE_SORT_FIELDS)[number];
export const DEFAULT_PROFILE_SORT_FIELD: ProfileSortField = "createdAt";

export const PROFILE_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type ProfileSortDirection = (typeof PROFILE_SORT_DIRECTIONS)[number];
export const DEFAULT_PROFILE_SORT_DIRECTION: ProfileSortDirection = "desc";

export const DEFAULT_PROFILE_PAGE_SIZE = 20;

/**
 * The admin Users listing's own filter shape — deliberately separate
 * from `auth/types/profile.ts`'s `ProfileSearchFilters` (that one is
 * `limit`/`offset`-based, used by option-list callers like the Enrollment
 * selectors; this one is `page`/`pageSize`-based with sorting, matching
 * `CourseSearchFilters`/`EnrollmentSearchFilters`'s shape exactly).
 */
export interface ProfileAdminSearchFilters {
  /** Matches full name, display name, or email. */
  query?: string;
  role?: Role;
  status?: ProfileStatus;
  sortBy?: ProfileSortField;
  sortDirection?: ProfileSortDirection;
  page?: number;
  pageSize?: number;
}

/** Mirrors `courses/types/course-search.ts`'s `CourseSearchResult<T>` —
 *  same shape, own copy per this codebase's per-domain convention. */
export interface ProfileSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
