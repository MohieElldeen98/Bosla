/** Mirrors `db/schema/commerce.ts`'s `order_status` Postgres enum
 *  exactly. No `"failed"` state at the order level — a failed payment
 *  attempt is recorded on the `PaymentIntent`/`PaymentTransaction`
 *  instead, and the order simply stays `"pending"` so the student can
 *  retry. */
export const ORDER_STATUSES = ["pending", "paid", "cancelled", "refunded"] as const;
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
  total: string;
  currency?: string;
  couponId?: string | null;
}
