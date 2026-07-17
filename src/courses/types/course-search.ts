import type { CourseLanguage } from "@/courses/types/course-language";
import type { CourseLevel } from "@/courses/types/course-level";
import type { CourseStatus } from "@/courses/types/course-status";

/** Columns the admin course listing (Step 3.2) can sort by — `title`/
 *  `description` are excluded since they're jsonb (bilingual); sorting a
 *  JSON blob isn't a meaningful order without picking a locale first. */
export const COURSE_SORT_FIELDS = ["updatedAt", "createdAt", "slug", "price", "status"] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number] | "estimatedDurationMinutes";
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
  /** Added for the public catalog (Step 3.4) — unused by the admin
   *  listing (Step 3.2), which shows every language/level. */
  language?: CourseLanguage;
  level?: CourseLevel;
  isFree?: boolean;
  featured?: boolean;
  sortBy?: CourseSortField;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
  /** Public-catalog-only (Step 3.4): also requires the course's
   *  specialty/instructor (and category, if set) to each be `is_active`.
   *  Defaults to `false` so Step 3.2's admin listing keeps showing every
   *  course regardless of a referenced specialty/instructor/category's
   *  active state — an admin managing the catalog needs to see those too,
   *  e.g. to reassign a course off a specialty they're about to retire.
   *  Never set from a URL param — the public page hard-codes it. */
  onlyActive?: boolean;
}

export interface CourseSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * A course listing row's display-ready shape — a `ResolvedCourse` plus
 * the specialty/category/instructor names and cover image URL resolved,
 * composed at the Service layer from parallel repository reads (the same
 * "no cross-domain SQL joins, compose in the service" pattern
 * `CmsPageService.getResolvedBySlug` already established). Shared by both
 * the admin listing (`/admin/courses`, Step 3.2) and the public catalog
 * (`/courses`, Step 3.4) — one resolved shape, one `searchResolved`
 * method; the admin UI just doesn't render every field.
 */
export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  specialtyId: string;
  specialtyName: string;
  categoryId: string | null;
  categoryName: string | null;
  instructorId: string;
  instructorName: string;
  instructorAvatarUrl: string | null;
  instructorQualification: string | null;
  level: CourseLevel;
  status: CourseStatus;
  language: CourseLanguage;
  price: string;
  originalPrice: string | null;
  currency: string;
  isFree: boolean;
  featured: boolean;
  certificateAvailable: boolean;
  lessonCount: number;
  estimatedDurationMinutes: number | null;
  coverImageUrl: string | null;
  updatedAt: string;
}

/**
 * The public course detail page's (`/courses/[slug]`, Step 3.4)
 * display-ready shape — `ResolvedCourse` (already has description/
 * requirements/learningObjectives/targetAudience resolved to plain
 * strings via `toResolvedCourse`) plus the same specialty/category/
 * instructor names and cover image URL resolution `CourseListItem` uses,
 * composed the same way in `CourseService.getPublicDetailBySlug`.
 */
export interface PublicCourseDetail {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  shortDescription: string | null;
  requirements: string[];
  learningObjectives: string[];
  targetAudience: string[];
  specialtyId: string;
  specialtyName: string;
  categoryId: string | null;
  categoryName: string | null;
  instructorId: string;
  instructorName: string;
  level: CourseLevel;
  language: CourseLanguage;
  price: string;
  originalPrice: string | null;
  currency: string;
  isFree: boolean;
  featured: boolean;
  certificateAvailable: boolean;
  estimatedDurationMinutes: number | null;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageUrl: string | null;
  seoCanonicalPath: string | null;
}
