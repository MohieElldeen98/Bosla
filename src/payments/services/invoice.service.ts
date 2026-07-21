import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { InvoiceRepository } from "@/payments/repositories/invoice.repository";
import { paymentsLogger } from "@/payments/utils/payments-logger";
import type { Invoice } from "@/payments/types/invoice";
import type { Order } from "@/commerce/types/order";

export interface InvoicePdfContext {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
}

/**
 * Issues and renders the receipt of record. `issueForOrder` is strictly
 * once-per-order (the unique `order_id` slot absorbs races — whoever
 * loses simply reads the winner's row); numbers come from the
 * collision-proof `invoice_number_seq` sequence formatted as
 * `INV-<year>-<seq>`. The PDF is rendered on demand from the stored
 * totals, never persisted — regenerating it is cheap and the row is the
 * legal source of truth.
 */
export const InvoiceService = {
  async issueForOrder(order: Order): Promise<Invoice | null> {
    const existing = await InvoiceRepository.findByOrderId(order.id);
    if (existing) return existing;

    const sequence = await InvoiceRepository.nextSequenceValue();
    const invoiceNumber = `INV-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, "0")}`;
    const { created, invoice } = await InvoiceRepository.create({
      orderId: order.id,
      invoiceNumber,
      currency: order.currency,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      total: order.total,
    });
    if (created && invoice) {
      paymentsLogger.info("invoice.issued", { invoiceId: invoice.id, invoiceNumber, orderId: order.id });
      return invoice;
    }
    return InvoiceRepository.findByOrderId(order.id);
  },

  async getById(id: string): Promise<Invoice | null> {
    return InvoiceRepository.findById(id);
  },

  async getByOrderId(orderId: string): Promise<Invoice | null> {
    return InvoiceRepository.findByOrderId(orderId);
  },

  /** A clean single-page A4 receipt via `pdf-lib` (already a project
   *  dependency). WinAnsi-safe text only — course titles can be Arabic,
   *  which Helvetica can't encode, so non-encodable characters are
   *  replaced rather than crashing the download. */
  async renderPdf(invoice: Invoice, context: InvoicePdfContext): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // A4 portrait, points
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const ink = rgb(0.07, 0.09, 0.15);
    const muted = rgb(0.42, 0.45, 0.5);
    const line = rgb(0.9, 0.91, 0.92);
    const margin = 56;
    const width = page.getWidth() - margin * 2;

    const sanitize = (value: string): string =>
      // Strip anything Helvetica/WinAnsi can't encode (Arabic script,
      // emoji, …) — the invoice row keeps the exact original strings.
      value.replace(/[^ -~ -ÿ]/g, "").trim() || "—";

    let y = page.getHeight() - margin;
    const text = (value: string, options: { x?: number; size?: number; bold?: boolean; color?: typeof ink; alignRight?: boolean }) => {
      const useFont = options.bold ? bold : font;
      const size = options.size ?? 10;
      const clean = sanitize(value);
      const x = options.alignRight
        ? margin + width - useFont.widthOfTextAtSize(clean, size)
        : (options.x ?? margin);
      page.drawText(clean, { x, y, size, font: useFont, color: options.color ?? ink });
    };

    text("Bosla", { size: 22, bold: true });
    y -= 16;
    text("Receipt / Invoice", { size: 11, color: muted });

    y = page.getHeight() - margin;
    text(invoice.invoiceNumber, { size: 12, bold: true, alignRight: true });
    y -= 16;
    text(`Issued ${new Date(invoice.issuedAt).toISOString().slice(0, 10)}`, { size: 10, color: muted, alignRight: true });

    y -= 48;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 1, color: line });

    y -= 28;
    text("Billed to", { size: 9, color: muted });
    y -= 14;
    text(context.studentName, { size: 11, bold: true });
    y -= 14;
    text(context.studentEmail, { size: 10, color: muted });

    y -= 32;
    text("Item", { size: 9, color: muted });
    text(`Amount (${invoice.currency})`, { size: 9, color: muted, alignRight: true });
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 1, color: line });

    y -= 20;
    text(context.courseTitle, { size: 11 });
    text(invoice.subtotal, { size: 11, alignRight: true });

    const totals: [string, string, boolean][] = [
      ["Subtotal", invoice.subtotal, false],
      ...(Number(invoice.discountTotal) > 0 ? ([["Discount", `-${invoice.discountTotal}`, false]] as [string, string, boolean][]) : []),
      ...(Number(invoice.taxTotal) > 0 ? ([["Tax", invoice.taxTotal, false]] as [string, string, boolean][]) : []),
      [`Total (${invoice.currency})`, invoice.total, true],
    ];
    y -= 16;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 1, color: line });
    for (const [label, amount, emphasize] of totals) {
      y -= 20;
      text(label, { x: margin + width * 0.55, size: emphasize ? 12 : 10, bold: emphasize, color: emphasize ? ink : muted });
      text(amount, { size: emphasize ? 12 : 10, bold: emphasize, alignRight: true });
    }

    y -= 40;
    text(`Order reference: ${invoice.orderId}`, { size: 9, color: muted });
    y -= 14;
    text("Thank you for learning with Bosla.", { size: 9, color: muted });

    return doc.save();
  },
};
