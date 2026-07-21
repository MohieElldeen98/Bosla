import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { invoices } from "@/db/schema/payments";
import type { Invoice, NewInvoiceInput } from "@/payments/types/invoice";

type InvoiceRow = typeof invoices.$inferSelect;

function mapRowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    orderId: row.orderId,
    invoiceNumber: row.invoiceNumber,
    currency: row.currency,
    subtotal: row.subtotal,
    discountTotal: row.discountTotal,
    taxTotal: row.taxTotal,
    total: row.total,
    issuedAt: row.issuedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Data access for `invoices`. `InvoiceService` is the only caller. */
export const InvoiceRepository = {
  /** The next value of the collision-proof `invoice_number_seq`
   *  Postgres sequence — `InvoiceService` formats it into the public
   *  invoice number. */
  async nextSequenceValue(): Promise<number> {
    const rows = await getDb().execute<{ nextval: string | number }>(
      sql`select nextval('invoice_number_seq') as nextval`,
    );
    const value = rows[0]?.nextval;
    if (value === undefined) {
      throw new Error("invoice_number_seq returned no value.");
    }
    return Number(value);
  },

  /** `created: false` when the order already has its invoice (the
   *  unique `order_id` slot) — issuing is strictly once-per-order. */
  async create(input: NewInvoiceInput): Promise<{ created: boolean; invoice: Invoice | null }> {
    const [row] = await getDb()
      .insert(invoices)
      .values({
        orderId: input.orderId,
        invoiceNumber: input.invoiceNumber,
        currency: input.currency,
        subtotal: input.subtotal,
        discountTotal: input.discountTotal,
        taxTotal: input.taxTotal,
        total: input.total,
      })
      .onConflictDoNothing()
      .returning();
    return row ? { created: true, invoice: mapRowToInvoice(row) } : { created: false, invoice: null };
  },

  async findById(id: string): Promise<Invoice | null> {
    const [row] = await getDb().select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return row ? mapRowToInvoice(row) : null;
  },

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    const [row] = await getDb().select().from(invoices).where(eq(invoices.orderId, orderId)).limit(1);
    return row ? mapRowToInvoice(row) : null;
  },

  async findByOrderIds(orderIds: string[]): Promise<Invoice[]> {
    if (orderIds.length === 0) return [];
    const rows = await getDb().select().from(invoices).where(inArray(invoices.orderId, orderIds));
    return rows.map(mapRowToInvoice);
  },
};
