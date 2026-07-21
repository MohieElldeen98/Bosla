import { and, asc, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema/payments";
import { computeAttemptExpiry } from "@/payments/checkout/payment-attempt-config";
import {
  DEFAULT_PAYMENT_PAGE_SIZE,
  DEFAULT_PAYMENT_SORT_DIRECTION,
  DEFAULT_PAYMENT_SORT_FIELD,
  type PaymentSearchFilters,
  type PaymentSearchResult,
} from "@/payments/types/payment-search";
import type { NewPaymentInput, Payment, PaymentUpdateInput } from "@/payments/types/payment";
import type { OptimisticUpdateResult } from "@/payments/types/repository-result";

type PaymentRow = typeof payments.$inferSelect;

const SORT_COLUMNS = {
  createdAt: payments.createdAt,
  updatedAt: payments.updatedAt,
  amount: payments.amount,
} as const;

function mapRowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.orderId,
    provider: row.provider,
    providerPaymentId: row.providerPaymentId,
    providerTransactionId: row.providerTransactionId,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    capturedAmount: row.capturedAmount,
    refundedAmount: row.refundedAmount,
    paymentMethod: row.paymentMethod,
    providerResponse: (row.providerResponse ?? {}) as Record<string, unknown>,
    attemptNumber: row.attemptNumber,
    idempotencyKey: row.idempotencyKey,
    expiresAt: row.expiresAt.toISOString(),
    expiredAt: row.expiredAt ? row.expiredAt.toISOString() : null,
    abandonedAt: row.abandonedAt ? row.abandonedAt.toISOString() : null,
    abandonedReason: row.abandonedReason,
    failureReason: row.failureReason,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `payments`. The Payment Platform's services are the
 *  only callers (plus `OrderService.resolveOrders`' read of an order's
 *  latest payment status). */
export const PaymentRepository = {
  async create(input: NewPaymentInput): Promise<Payment> {
    const [row] = await getDb()
      .insert(payments)
      .values({
        orderId: input.orderId,
        provider: input.provider,
        amount: input.amount,
        currency: input.currency,
        providerPaymentId: input.providerPaymentId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        attemptNumber: input.attemptNumber ?? 1,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : computeAttemptExpiry(),
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToPayment(row);
  },

  /** The expiry sweep's read: every `pending` row whose deadline has
   *  passed (optionally scoped to one order for the lazy per-request
   *  sweep). Callers decide the write (`update` to `expired`) — this is
   *  intentionally read-only so the sweep stays a service-layer
   *  decision, not something a repository method does implicitly. */
  async findExpiredPending(options?: { orderId?: string; now?: Date }): Promise<Payment[]> {
    const conditions = [eq(payments.status, "pending"), lt(payments.expiresAt, options?.now ?? new Date())];
    if (options?.orderId) conditions.push(eq(payments.orderId, options.orderId));
    const rows = await getDb()
      .select()
      .from(payments)
      .where(and(...conditions));
    return rows.map(mapRowToPayment);
  },

  async findById(id: string): Promise<Payment | null> {
    const [row] = await getDb().select().from(payments).where(eq(payments.id, id)).limit(1);
    return row ? mapRowToPayment(row) : null;
  },

  /** Newest first — an order can accumulate attempts (a failed try,
   *  then a retry); the latest is what checkout/admin views care
   *  about. */
  async findByOrderId(orderId: string): Promise<Payment[]> {
    const rows = await getDb()
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.createdAt));
    return rows.map(mapRowToPayment);
  },

  /** Batch lookup for listings' "latest payment status" column —
   *  callers reduce to latest-per-order themselves, same pattern the
   *  old `PaymentIntentRepository.findByOrderIds` used. */
  async findByOrderIds(orderIds: string[]): Promise<Payment[]> {
    if (orderIds.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(payments)
      .where(inArray(payments.orderId, orderIds))
      .orderBy(desc(payments.createdAt));
    return rows.map(mapRowToPayment);
  },

  async findByProviderPaymentId(provider: string, providerPaymentId: string): Promise<Payment | null> {
    const [row] = await getDb()
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider), eq(payments.providerPaymentId, providerPaymentId)))
      .limit(1);
    return row ? mapRowToPayment(row) : null;
  },

  async findByProviderTransactionId(provider: string, providerTransactionId: string): Promise<Payment | null> {
    const [row] = await getDb()
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider), eq(payments.providerTransactionId, providerTransactionId)))
      .limit(1);
    return row ? mapRowToPayment(row) : null;
  },

  /** The admin Payments listing — mirrors `OrderRepository.search`'s
   *  paginated shape. `query` matches our ids and the provider's. */
  async search(filters: PaymentSearchFilters): Promise<PaymentSearchResult<Payment>> {
    const conditions: SQL[] = [];

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(sql`${payments.id}::text`, pattern),
          ilike(sql`${payments.orderId}::text`, pattern),
          ilike(payments.providerPaymentId, pattern),
          ilike(payments.providerTransactionId, pattern),
        ) as SQL,
      );
    }
    if (filters.status) conditions.push(eq(payments.status, filters.status));
    if (filters.provider) conditions.push(eq(payments.provider, filters.provider));
    if (filters.orderId) conditions.push(eq(payments.orderId, filters.orderId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_PAYMENT_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_PAYMENT_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_PAYMENT_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(payments)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToPayment),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Optimistic-concurrency update, same convention
   *  `OrderRepository.updateStatus` uses — status-transition legality is
   *  the service layer's job (`FINAL_PAYMENT_STATUSES`); this method is
   *  storage only. */
  async update(
    id: string,
    input: PaymentUpdateInput,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Payment>> {
    const conditions = [eq(payments.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(payments.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(payments)
      .set({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.providerPaymentId !== undefined ? { providerPaymentId: input.providerPaymentId } : {}),
        ...(input.providerTransactionId !== undefined ? { providerTransactionId: input.providerTransactionId } : {}),
        ...(input.capturedAmount !== undefined ? { capturedAmount: input.capturedAmount } : {}),
        ...(input.refundedAmount !== undefined ? { refundedAmount: input.refundedAmount } : {}),
        ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
        ...(input.providerResponse !== undefined ? { providerResponse: input.providerResponse } : {}),
        ...(input.verifiedAt !== undefined
          ? { verifiedAt: input.verifiedAt ? new Date(input.verifiedAt) : null }
          : {}),
        ...(input.expiredAt !== undefined ? { expiredAt: input.expiredAt ? new Date(input.expiredAt) : null } : {}),
        ...(input.abandonedAt !== undefined
          ? { abandonedAt: input.abandonedAt ? new Date(input.abandonedAt) : null }
          : {}),
        ...(input.abandonedReason !== undefined ? { abandonedReason: input.abandonedReason } : {}),
        ...(input.failureReason !== undefined ? { failureReason: input.failureReason } : {}),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToPayment(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await PaymentRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },
};
