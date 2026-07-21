import type { PaymentEventType } from "@/payments/types/payment-event";

/**
 * The Payment Platform's one seam (docs/payment-platform.md) — every
 * gateway (Paymob today; Stripe/Geidea/Fawry/Meeza/… later) implements
 * this interface, and NOTHING outside `src/payments/providers/` may
 * import a provider module or know a provider concept. Business logic
 * (checkout, orders, enrollment, refunds, admin) talks only to these
 * normalized shapes; each adapter translates them to/from its
 * provider's wire format internally. Mirrors the role
 * `media/storage/types.ts`'s `StorageProvider` plays for object
 * storage.
 */

export interface ProviderCheckoutParams {
  /** Our `payments.id` — passed to the provider as the merchant
   *  reference so every webhook can be matched back unambiguously. */
  paymentId: string;
  orderId: string;
  /** Decimal string, major units ("199.99"); adapters convert to their
   *  provider's minor units themselves. */
  amount: string;
  currency: string;
  description: string;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  /** Where the provider's hosted page sends the browser afterwards —
   *  display-only; the redirect is NEVER trusted for payment state. */
  returnUrl: string;
}

export interface ProviderCheckoutSession {
  /** The provider's handle for this checkout (Paymob: intention id). */
  providerPaymentId: string;
  /** The hosted payment page the browser is sent to. */
  redirectUrl: string;
  raw: Record<string, unknown>;
}

/** A provider webhook delivery, reduced to the platform's normalized
 *  vocabulary by the adapter's `parseWebhook`. Anything the adapter
 *  can't extract stays `null` — the pipeline treats missing data as
 *  unverifiable, never as success. */
export interface ProviderWebhookEvent {
  eventType: PaymentEventType;
  /** The provider's unique id for this event/transaction — the
   *  replay/duplicate-delivery dedupe key. */
  providerEventId: string | null;
  providerPaymentId: string | null;
  providerTransactionId: string | null;
  /** Our `payments.id`, echoed back through the provider's merchant-
   *  reference field. */
  merchantReference: string | null;
  /** Decimal string in major units, as the provider reports it — the
   *  pipeline verifies this against the order before granting
   *  anything. */
  amount: string | null;
  currency: string | null;
  paymentMethod: string | null;
  raw: Record<string, unknown>;
}

export interface ProviderWebhookRequest {
  /** The exact raw request body — signatures verify bytes, not parsed
   *  JSON. */
  rawBody: string;
  /** Full request URL (some providers put the signature in a query
   *  param). */
  url: string;
  headers: Headers;
}

export interface ProviderVerification {
  verified: boolean;
  reason?: string;
}

export interface ProviderOperationResult {
  /** The provider's id for the operation (refund id, capture
   *  transaction id…). */
  providerReference: string | null;
  /** `succeeded` when the provider settled it synchronously, `pending`
   *  when confirmation arrives by webhook later. */
  status: "succeeded" | "pending";
  raw: Record<string, unknown>;
}

export interface ProviderPaymentSnapshot {
  providerTransactionId: string | null;
  eventType: PaymentEventType;
  amount: string | null;
  currency: string | null;
  raw: Record<string, unknown>;
}

/** What the adapter supports natively — services consult this before
 *  offering an operation (e.g. hide "Capture" for a provider without
 *  auth/capture) instead of finding out via a runtime error. */
export interface ProviderCapabilities {
  refund: boolean;
  partialRefund: boolean;
  capture: boolean;
  void: boolean;
}

export interface PaymentProviderAdapter {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;

  /** Create a hosted-checkout session for one payment. */
  createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutSession>;

  /** Verify a webhook delivery's authenticity (HMAC/signature over the
   *  raw request). MUST be constant-time on the comparison. */
  verifyWebhook(request: ProviderWebhookRequest): Promise<ProviderVerification>;

  /** Reduce a (verified) webhook delivery to the normalized event. Must
   *  not throw on malformed input — return `eventType: "unknown"`. */
  parseWebhook(request: ProviderWebhookRequest): ProviderWebhookEvent;

  /** Re-fetch a payment's authoritative state from the provider — the
   *  reconciliation path when webhooks are delayed or lost. */
  retrievePayment(providerTransactionId: string): Promise<ProviderPaymentSnapshot>;

  /** Refund a settled transaction (full or partial via `amount`). */
  refund(params: { providerTransactionId: string; amount: string; currency: string }): Promise<ProviderOperationResult>;

  /** Capture a previously authorized transaction. */
  capture(params: { providerTransactionId: string; amount: string; currency: string }): Promise<ProviderOperationResult>;

  /** Void a previously authorized, not-yet-captured transaction. */
  void(params: { providerTransactionId: string }): Promise<ProviderOperationResult>;
}
