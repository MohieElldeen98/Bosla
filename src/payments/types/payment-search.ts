import type { PaymentStatus } from "@/payments/types/payment";

/** Mirrors `commerce/types/order-search.ts`'s shape — the admin
 *  Payments listing's filters/result, own copy per domain. */
export const PAYMENT_SORT_FIELDS = ["createdAt", "updatedAt", "amount"] as const;
export type PaymentSortField = (typeof PAYMENT_SORT_FIELDS)[number];
export const DEFAULT_PAYMENT_SORT_FIELD: PaymentSortField = "createdAt";

export const PAYMENT_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type PaymentSortDirection = (typeof PAYMENT_SORT_DIRECTIONS)[number];
export const DEFAULT_PAYMENT_SORT_DIRECTION: PaymentSortDirection = "desc";

export const DEFAULT_PAYMENT_PAGE_SIZE = 20;

export interface PaymentSearchFilters {
  /** Matches the payment id, order id, or the provider's own
   *  payment/transaction ids — what a support agent has in hand when a
   *  student writes in. */
  query?: string;
  status?: PaymentStatus;
  provider?: string;
  orderId?: string;
  sortBy?: PaymentSortField;
  sortDirection?: PaymentSortDirection;
  page?: number;
  pageSize?: number;
}

export interface PaymentSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** The admin Payments listing's display-ready row — a `Payment` plus
 *  the student/course context resolved at the service layer, same
 *  composition pattern `OrderListItem` uses. */
export interface PaymentListItem {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  providerTransactionId: string | null;
  status: PaymentStatus;
  amount: string;
  currency: string;
  capturedAmount: string;
  refundedAmount: string;
  paymentMethod: string | null;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
