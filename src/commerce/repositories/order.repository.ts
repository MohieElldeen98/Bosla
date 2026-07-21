import { and, asc, desc, eq, exists, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { orderItems, orders } from "@/db/schema/commerce";
import { courses } from "@/db/schema/course";
import { profiles } from "@/db/schema/profiles";
import {
  DEFAULT_ORDER_PAGE_SIZE,
  DEFAULT_ORDER_SORT_DIRECTION,
  DEFAULT_ORDER_SORT_FIELD,
  type OrderSearchFilters,
  type OrderSearchResult,
} from "@/commerce/types/order-search";
import type { NewOrderInput, Order, OrderStatus } from "@/commerce/types/order";
import type { OptimisticUpdateResult } from "@/commerce/types/repository-result";

type OrderRow = typeof orders.$inferSelect;

const SORT_COLUMNS = {
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
  total: orders.total,
} as const;

function mapRowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    studentId: row.studentId,
    status: row.status,
    subtotal: row.subtotal,
    discountTotal: row.discountTotal,
    taxTotal: row.taxTotal,
    total: row.total,
    currency: row.currency,
    couponId: row.couponId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `orders`. `OrderService` is the only caller. */
export const OrderRepository = {
  /** `updatedAt` is always explicitly set to a JS-constructed `Date`,
   *  never left to the column's `now()` default — same timestamp-
   *  precision fix `CourseRepository.create` established (Postgres
   *  `now()` has microsecond precision; a JS `Date` only preserves
   *  milliseconds, which would spuriously conflict on the very first
   *  optimistic-concurrency check after creation). */
  async create(input: NewOrderInput): Promise<Order> {
    const [row] = await getDb()
      .insert(orders)
      .values({
        studentId: input.studentId,
        status: input.status ?? "pending",
        subtotal: input.subtotal,
        discountTotal: input.discountTotal ?? "0",
        taxTotal: input.taxTotal ?? "0",
        total: input.total,
        currency: input.currency ?? "USD",
        couponId: input.couponId ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToOrder(row);
  },

  async findById(id: string): Promise<Order | null> {
    const [row] = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
    return row ? mapRowToOrder(row) : null;
  },

  /** Newest first — a student's most recent order is what the Orders &
   *  Billing page shows first. */
  async findByStudentId(studentId: string): Promise<Order[]> {
    const rows = await getDb()
      .select()
      .from(orders)
      .where(eq(orders.studentId, studentId))
      .orderBy(desc(orders.createdAt));
    return rows.map(mapRowToOrder);
  },

  /** "Does this student already have a non-final order for this
   *  course" — the duplicate-purchase guard `OrderService.
   *  createFromCheckout` checks before creating a new order. An order
   *  in `pending` blocks a second checkout attempt (resume it instead);
   *  `paid` blocks re-purchasing something already owned (the
   *  enrollment check catches this too, but a `paid` order without a
   *  live enrollment — e.g. after a refund reversed it — should still
   *  not be double-charged for). */
  async findActiveByStudentAndCourse(studentId: string, courseId: string): Promise<Order | null> {
    const [row] = await getDb()
      .select({ order: orders })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.studentId, studentId),
          eq(orderItems.courseId, courseId),
          or(eq(orders.status, "pending"), eq(orders.status, "paid")),
        ),
      )
      .limit(1);
    return row ? mapRowToOrder(row.order) : null;
  },

  /**
   * The admin Orders listing's (and the Student Dashboard's) data
   * source — paginated/sorted, mirrors `CourseRepository.search`'s exact
   * shape. `query` matches student name/email or course title via
   * `EXISTS` subqueries (no cross-domain SQL join), the same pattern
   * `EnrollmentRepository.search`'s own free-text search established.
   */
  async search(filters: OrderSearchFilters): Promise<OrderSearchResult<Order>> {
    const conditions: SQL[] = [];

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          exists(
            getDb()
              .select({ one: sql`1` })
              .from(profiles)
              .where(
                and(
                  eq(profiles.userId, orders.studentId),
                  or(
                    ilike(profiles.fullName, pattern),
                    ilike(profiles.displayName, pattern),
                    ilike(profiles.email, pattern),
                  ),
                ),
              ),
          ),
          exists(
            getDb()
              .select({ one: sql`1` })
              .from(orderItems)
              .innerJoin(courses, eq(courses.id, orderItems.courseId))
              .where(
                and(
                  eq(orderItems.orderId, orders.id),
                  or(
                    ilike(sql`${courses.title}->>'en'`, pattern),
                    ilike(sql`${courses.title}->>'ar'`, pattern),
                  ),
                ),
              ),
          ),
        ) as SQL,
      );
    }
    if (filters.studentId) conditions.push(eq(orders.studentId, filters.studentId));
    if (filters.status) conditions.push(eq(orders.status, filters.status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_ORDER_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_ORDER_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_ORDER_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToOrder),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** `expectedUpdatedAt`, when given, enforces optimistic concurrency
   *  the same way `EnrollmentRepository.updateStatus` does — see that
   *  repository's doc comment for the full rationale. */
  async updateStatus(
    id: string,
    status: OrderStatus,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Order>> {
    const conditions = [eq(orders.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(orders.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToOrder(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await OrderRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },
};
