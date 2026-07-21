/** The pricing engine's one output shape — every total the checkout
 *  writes to an `Order` comes from here (`src/payments/pricing/`),
 *  computed once at order-creation time and locked in. All decimal
 *  strings, 2 places. */
export interface PricingBreakdown {
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  /** True when `total` is exactly zero — the checkout skips the
   *  provider entirely and completes the order immediately. */
  isFree: boolean;
}
