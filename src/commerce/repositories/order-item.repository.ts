import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { orderItems } from "@/db/schema/commerce";
import type { NewOrderItemInput, OrderItem } from "@/commerce/types/order-item";

type OrderItemRow = typeof orderItems.$inferSelect;

function mapRowToOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.orderId,
    courseId: row.courseId,
    unitPrice: row.unitPrice,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Data access for `order_items`. `OrderService` is the only caller —
 *  one row per order today (single-course checkout), but modeled as its
 *  own table so a multi-course cart later isn't a migration (see
 *  `db/schema/commerce.ts`'s doc comment). */
export const OrderItemRepository = {
  async create(input: NewOrderItemInput): Promise<OrderItem> {
    const [row] = await getDb().insert(orderItems).values(input).returning();
    return mapRowToOrderItem(row);
  },

  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    const rows = await getDb().select().from(orderItems).where(eq(orderItems.orderId, orderId));
    return rows.map(mapRowToOrderItem);
  },

  /** Batch lookup — for composing the admin/Dashboard Orders listing's
   *  course title per row without an N+1 query, matching
   *  `SpecialtyRepository.findByIds`'s established pattern. */
  async findByOrderIds(orderIds: string[]): Promise<OrderItem[]> {
    if (orderIds.length === 0) return [];
    const rows = await getDb().select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
    return rows.map(mapRowToOrderItem);
  },
};
