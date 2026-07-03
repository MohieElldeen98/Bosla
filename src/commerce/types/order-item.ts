/** Mirrors `db/schema/commerce.ts`'s `order_items` table — one row per
 *  purchased course. `unitPrice` is the course's price *at the time of
 *  purchase*, never recalculated from the live course price. */
export interface OrderItem {
  id: string;
  orderId: string;
  courseId: string;
  unitPrice: string;
  createdAt: string;
}

export interface NewOrderItemInput {
  orderId: string;
  courseId: string;
  unitPrice: string;
}
