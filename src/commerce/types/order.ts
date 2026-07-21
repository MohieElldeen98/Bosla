/** Mirrors `db/schema/commerce.ts`'s `order_status` Postgres enum
 *  exactly. A failed payment ATTEMPT normally leaves the order
 *  `"pending"` so the student can retry (the attempt itself is recorded
 *  on the Payment Platform's `payments` row); `"failed"` and
 *  `"expired"` are terminal states an admin (or a future expiry sweep)
 *  applies when an order should stop being payable. */
export const ORDER_STATUSES = ["pending", "paid", "cancelled", "refunded", "failed", "expired"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Mirrors `db/schema/commerce.ts`'s `orders` table. Money fields are
 *  `string` (Postgres `numeric` round-trips through Drizzle as a string
 *  to avoid floating-point precision loss), same convention
 *  `courses.price` already established. */
export interface Order {
  id: string;
  studentId: string;
  status: OrderStatus;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  currency: string;
  couponId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrderInput {
  studentId: string;
  status?: OrderStatus;
  subtotal: string;
  discountTotal?: string;
  taxTotal?: string;
  total: string;
  currency?: string;
  couponId?: string | null;
}
