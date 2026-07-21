import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentEvents } from "@/db/schema/payments";
import type { NewPaymentEventInput, PaymentEvent } from "@/payments/types/payment-event";

type PaymentEventRow = typeof paymentEvents.$inferSelect;

function mapRowToPaymentEvent(row: PaymentEventRow): PaymentEvent {
  return {
    id: row.id,
    paymentId: row.paymentId,
    provider: row.provider,
    eventType: row.eventType,
    providerEventId: row.providerEventId,
    signatureVerified: row.signatureVerified,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    processedAt: row.processedAt ? row.processedAt.toISOString() : null,
    processingError: row.processingError,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Data access for `payment_events` — append-plus-processing-stamp
 *  only: rows are never mutated beyond `processedAt`/`processingError`/
 *  late `paymentId` attachment, and NEVER deleted (the immutable audit
 *  log, docs/payment-platform.md). */
export const PaymentEventRepository = {
  /**
   * Insert honoring the `(provider, providerEventId, eventType)` unique
   * slot — `created: false` means this exact delivery was already
   * recorded (a provider retry / replay), and the caller must
   * acknowledge without reprocessing.
   */
  async create(input: NewPaymentEventInput): Promise<{ created: boolean; event: PaymentEvent | null }> {
    const [row] = await getDb()
      .insert(paymentEvents)
      .values({
        paymentId: input.paymentId ?? null,
        provider: input.provider,
        eventType: input.eventType,
        providerEventId: input.providerEventId ?? null,
        signatureVerified: input.signatureVerified,
        payload: input.payload,
      })
      .onConflictDoNothing()
      .returning();
    return row ? { created: true, event: mapRowToPaymentEvent(row) } : { created: false, event: null };
  },

  /** The already-recorded delivery occupying a dedupe slot — lets the
   *  webhook pipeline distinguish "processed fine, pure replay" from
   *  "recorded but processing failed; the provider's retry should
   *  resume." */
  async findByProviderEvent(
    provider: string,
    providerEventId: string,
    eventType: string,
  ): Promise<PaymentEvent | null> {
    const [row] = await getDb()
      .select()
      .from(paymentEvents)
      .where(
        and(
          eq(paymentEvents.provider, provider),
          eq(paymentEvents.providerEventId, providerEventId),
          eq(paymentEvents.eventType, eventType),
        ),
      )
      .limit(1);
    return row ? mapRowToPaymentEvent(row) : null;
  },

  async findByPaymentId(paymentId: string): Promise<PaymentEvent[]> {
    const rows = await getDb()
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.paymentId, paymentId))
      .orderBy(desc(paymentEvents.createdAt));
    return rows.map(mapRowToPaymentEvent);
  },

  async markProcessed(id: string, error?: string | null): Promise<void> {
    await getDb()
      .update(paymentEvents)
      .set({ processedAt: new Date(), processingError: error ?? null })
      .where(eq(paymentEvents.id, id));
  },

  /** Late attachment for events that arrived before their payment could
   *  be matched (or matched only during processing). */
  async attachPayment(id: string, paymentId: string): Promise<void> {
    await getDb().update(paymentEvents).set({ paymentId }).where(eq(paymentEvents.id, id));
  },
};
