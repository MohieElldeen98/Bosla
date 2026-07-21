/** Mirrors `db/schema/payments.ts`'s `invoices` table — the receipt of
 *  record, issued exactly once per completed order. Totals are copies
 *  taken at issue time, never recomputed. */
export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  issuedAt: string;
  createdAt: string;
}

export interface NewInvoiceInput {
  orderId: string;
  invoiceNumber: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
}
