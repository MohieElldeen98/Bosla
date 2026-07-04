/** Mirrors `commerce/types/coupon-search.ts`'s sort-field shape — the
 *  same small, fixed sortable-column pattern every search filter type in
 *  this codebase uses. Notifications only ever sort one way in
 *  practice (newest first), but the field/direction pair is kept for
 *  consistency with every other domain's own search filters type. */
export const NOTIFICATION_SORT_FIELDS = ["createdAt"] as const;
export type NotificationSortField = (typeof NOTIFICATION_SORT_FIELDS)[number];
export const DEFAULT_NOTIFICATION_SORT_FIELD: NotificationSortField = "createdAt";

export const NOTIFICATION_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type NotificationSortDirection = (typeof NOTIFICATION_SORT_DIRECTIONS)[number];
export const DEFAULT_NOTIFICATION_SORT_DIRECTION: NotificationSortDirection = "desc";

export const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;

export interface NotificationSearchFilters {
  /** The bell dropdown's own filter — omit for the full `/notifications`
   *  page, which shows both read and unread. */
  unreadOnly?: boolean;
  sortBy?: NotificationSortField;
  sortDirection?: NotificationSortDirection;
  page?: number;
  pageSize?: number;
}

export interface NotificationSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
