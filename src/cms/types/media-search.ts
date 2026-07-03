import type { MediaFileType } from "@/cms/types/media-library";

/** Mirrors `commerce/types/coupon-search.ts`'s sort-field shape — the
 *  same small, fixed sortable-column pattern every search filter type in
 *  this codebase uses. */
export const MEDIA_SORT_FIELDS = ["createdAt", "fileSize"] as const;
export type MediaSortField = (typeof MEDIA_SORT_FIELDS)[number];
export const DEFAULT_MEDIA_SORT_FIELD: MediaSortField = "createdAt";

export const MEDIA_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type MediaSortDirection = (typeof MEDIA_SORT_DIRECTIONS)[number];
export const DEFAULT_MEDIA_SORT_DIRECTION: MediaSortDirection = "desc";

export const DEFAULT_MEDIA_PAGE_SIZE = 24;

export interface MediaSearchFilters {
  /** Matches title/alt/caption/description/tags (any locale) and the
   *  original filename embedded in `storagePath`. */
  query?: string;
  fileType?: MediaFileType;
  folder?: string;
  tag?: string;
  sortBy?: MediaSortField;
  sortDirection?: MediaSortDirection;
  page?: number;
  pageSize?: number;
}

export interface MediaSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
