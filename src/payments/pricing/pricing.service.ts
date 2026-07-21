import { paymentEnv } from "@/lib/env";
import type { PricingBreakdown } from "@/payments/types/pricing";

function round2(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

/**
 * The pricing engine — the ONE place an order's totals are computed
 * (docs/payment-platform.md §Pricing). `OrderService.createFromCheckout`
 * calls this once and locks the breakdown into the `Order` row; nothing
 * ever recomputes it later.
 *
 * Order of operations is fixed: discount applies to the subtotal, tax
 * applies to what the student actually pays (subtotal − discount) —
 * the usual VAT-on-consideration rule. The rate comes from
 * `PAYMENT_TAX_RATE_PERCENT` (default 0 — Egypt collects none on course
 * sales today); replacing this knob with a per-country tax table later
 * changes only this module.
 */
export const PricingService = {
  compute(params: { unitPrice: string; discountAmount: string; currency: string }): PricingBreakdown {
    const subtotal = Math.max(0, Number(params.unitPrice) || 0);
    const discount = Math.min(Math.max(0, Number(params.discountAmount) || 0), subtotal);
    const taxable = subtotal - discount;

    const taxRatePercent = paymentEnv?.PAYMENT_TAX_RATE_PERCENT ?? 0;
    const tax = Math.round(taxable * taxRatePercent) / 100;
    const total = taxable + tax;

    return {
      currency: params.currency,
      subtotal: round2(subtotal),
      discountTotal: round2(discount),
      taxTotal: round2(tax),
      total: round2(total),
      isFree: Math.round(total * 100) === 0,
    };
  },
};
