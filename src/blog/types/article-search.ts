import type { ArticleLanguage } from "@/blog/types/article-language";
import type { ArticleReference } from "@/blog/types/article";
import type { ArticleStatus } from "@/blog/types/article-status";

/** Columns the article listings can sort by — bilingual jsonb fields
 *  (`title`/`excerpt`) are excluded, same reasoning as
 *  `courses/types/course-search.ts`. `publishedAt`/`viewCount` are the
 *  public listing's two orderings (latest / most popular). */
export const ARTICLE_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "publishedAt",
  "viewCount",
  "slug",
  "status",
] as const;
export type ArticleSortField = (typeof ARTICLE_SORT_FIELDS)[number];
export const DEFAULT_ARTICLE_SORT_FIELD: ArticleSortField = "updatedAt";

export const SORT_DIRECTIONS = ["asc", "desc"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];
export const DEFAULT_SORT_DIRECTION: SortDirection = "desc";

export const DEFAULT_PAGE_SIZE = 12;

export interface ArticleSearchFilters {
  query?: string;
  status?: ArticleStatus;
  categoryId?: string;
  authorId?: string;
  isFeatured?: boolean;
  sortBy?: ArticleSortField;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
  /** Public-listing-only: also requires the article's category, if set,
   *  to be `is_active` — same reasoning as `CourseSearchFilters.onlyActive`
   *  (the admin listing must keep showing articles whose category was
   *  deactivated). Never set from a URL param. */
  onlyActive?: boolean;
}

export interface ArticleSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * An article listing row's display-ready shape — locale-resolved title/
 * excerpt plus category/author names and the cover image URL, composed at
 * the Service layer from parallel repository reads (the same "no
 * cross-domain SQL joins" pattern as `CourseListItem`). Shared by the
 * admin listing and the public blog cards.
 */
export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  language: ArticleLanguage;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  status: ArticleStatus;
  publishedAt: string | null;
  readTimeMinutes: number;
  viewCount: number;
  isFeatured: boolean;
  coverImageUrl: string | null;
  updatedAt: string;
}

/**
 * The public article page's (`/blog/[slug]`) display-ready shape —
 * locale-resolved fields plus author/category/cover/SEO resolution,
 * composed in `ArticleService.getPublicDetailBySlug` the same way
 * `PublicCourseDetail` is.
 */
export interface PublicArticleDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  language: ArticleLanguage;
  /** Already sanitized at write time (`ArticleService` sanitizes before
   *  every body write) — safe to render via `dangerouslySetInnerHTML`. */
  bodyHtml: string;
  references: ArticleReference[];
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorBio: string | null;
  publishedAt: string | null;
  readTimeMinutes: number;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageUrl: string | null;
  seoCanonicalPath: string | null;
}
