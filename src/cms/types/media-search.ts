import type { MediaFileType } from "@/cms/types/media-library";

/** Mirrors `commerce/types/coupon-search.ts`'s sort-field shape — the
 *  same small, fixed sortable-column pattern every search filter type in
 *  this codebase uses. */
export const MEDIA_SORT_FIELDS = ["createdAt", "fileSize", "lastUsedAt"] as const;
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
  /** Scope to one uploader — `searchMediaAction` forces this to the
   *  caller for non-admin roles, so authors browse only their own
   *  uploads. Never taken from client input for those roles. */
  uploadedByUserId?: string;
  /** `"unused"` powers the Media Library's cleanup filter — assets
   *  `mediaUsageExistsCondition` finds no reference to anywhere in the
   *  app (safe candidates for bulk delete). `"used"` is its complement,
   *  for the opposite check ("is this file actually load-bearing"). */
  usage?: "used" | "unused";
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
