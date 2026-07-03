import { ManualPaymentGateway } from "@/commerce/payment-gateways/manual-payment-gateway";
import type { PaymentGateway } from "@/commerce/payment-gateways/payment-gateway";
import type { PaymentProvider } from "@/commerce/types/payment-intent";

export type { PaymentGateway, CheckoutSession, PaymentResult } from "@/commerce/payment-gateways/payment-gateway";

/** The registry every future provider adapter joins — `OrderService`/
 *  `PaymentService` call `getPaymentGateway(provider)`, never a
 *  provider's module directly, so adding Stripe/Paymob/Fawry later means
 *  adding one entry here, not touching checkout/webhook call sites. Only
 *  `"manual"` is implemented (Step 5.1's foundation-only scope) —
 *  requesting any other provider fails clearly rather than silently
 *  falling back to it. */
const GATEWAYS: Partial<Record<PaymentProvider, PaymentGateway>> = {
  manual: ManualPaymentGateway,
};

export function getPaymentGateway(provider: PaymentProvider): PaymentGateway {
  const gateway = GATEWAYS[provider];
  if (!gateway) {
    throw new Error(`No PaymentGateway implementation registered for provider "${provider}" yet.`);
  }
  return gateway;
}
