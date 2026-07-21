import type { OrderStatus } from "@/commerce/types/order";

/** Columns the admin Orders listing can sort by — mirrors
 *  `courses/types/course-search.ts`'s `COURSE_SORT_FIELDS` shape. */
export const ORDER_SORT_FIELDS = ["createdAt", "updatedAt", "total"] as const;
export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];
export const DEFAULT_ORDER_SORT_FIELD: OrderSortField = "createdAt";

export const ORDER_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type OrderSortDirection = (typeof ORDER_SORT_DIRECTIONS)[number];
export const DEFAULT_ORDER_SORT_DIRECTION: OrderSortDirection = "desc";

export const DEFAULT_ORDER_PAGE_SIZE = 20;

export interface OrderSearchFilters {
  /** Free-text — matches student name/email or course title, via
   *  `EXISTS` subqueries (no cross-domain SQL join), same pattern
   *  `EnrollmentRepository.search`'s own `query` filter established. */
  query?: string;
  studentId?: string;
  status?: OrderStatus;
  sortBy?: OrderSortField;
  sortDirection?: OrderSortDirection;
  page?: number;
  pageSize?: number;
}

/** Mirrors `courses/types/course-search.ts`'s `CourseSearchResult<T>` —
 *  same shape, own copy per this codebase's per-domain convention. */
export interface OrderSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * The admin Orders listing's (and the Student Dashboard's Orders &
 * Billing page's) display-ready row shape — an `Order` plus the
 * student/course names and payment status resolved, composed at the
 * Service layer from parallel repository reads (the same "no
 * cross-domain SQL joins, compose in the service" pattern
 * `EnrollmentService.searchResolved` already established). One order
 * today always has exactly one `order_items` row (single-course
 * checkout), so `courseTitle`/`courseSlug` are flattened here rather
 * than nesting a line-item array — this is the one place that
 * simplification would need to change if/when a multi-course cart ships.
 */
export interface OrderListItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  status: OrderStatus;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  currency: string;
  couponCode: string | null;
  /** The most recent Payment Platform `payments` row's status for this
   *  order, if any — `null` for a $0 order that never needed one (see
   *  `OrderService.createFromCheckout`'s doc comment). */
  latestPaymentStatus: string | null;
  /** The receipt of record, once issued (`invoices.id`) — links to
   *  `/api/payments/invoices/[id]/pdf`; `null` until the order
   *  completes. */
  invoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}
