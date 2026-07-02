import type { CourseLanguage } from "@/courses/types/course-language";
import type { CourseLevel } from "@/courses/types/course-level";
import type { CourseStatus } from "@/courses/types/course-status";

/** Columns the admin course listing (Step 3.2) can sort by — `title`/
 *  `description` are excluded since they're jsonb (bilingual); sorting a
 *  JSON blob isn't a meaningful order without picking a locale first. */
export const COURSE_SORT_FIELDS = ["updatedAt", "createdAt", "slug", "price", "status"] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];
export const DEFAULT_COURSE_SORT_FIELD: CourseSortField = "updatedAt";

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
export const DEFAULT_SORT_DIRECTION: SortDirection = "desc";

export const DEFAULT_PAGE_SIZE = 20;

export interface CourseSearchFilters {
  query?: string;
  status?: CourseStatus;
  specialtyId?: string;
  categoryId?: string;
  instructorId?: string;
  sortBy?: CourseSortField;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface CourseSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * The admin listing's display-ready row shape — a `ResolvedCourse` plus
 * the specialty/category/instructor names and cover image URL resolved,
 * composed at the Service layer from parallel repository reads (the same
 * "no cross-domain SQL joins, compose in the service" pattern
 * `CmsPageService.getResolvedBySlug` already established).
 */
export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  specialtyId: string;
  specialtyName: string;
  categoryId: string | null;
  categoryName: string | null;
  instructorId: string;
  instructorName: string;
  level: CourseLevel;
  status: CourseStatus;
  language: CourseLanguage;
  price: string;
  originalPrice: string | null;
  currency: string;
  coverImageUrl: string | null;
  updatedAt: string;
}
