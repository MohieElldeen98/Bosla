import { PaymobClient } from "@/payments/providers/paymob/paymob-client";
import { verifyPaymobTransactionHmac } from "@/payments/providers/paymob/paymob-hmac";
import { fromMinorUnits, toMinorUnits } from "@/payments/types/currency";
import type { PaymobEnv } from "@/lib/env";
import type {
  PaymentProviderAdapter,
  ProviderCheckoutParams,
  ProviderCheckoutSession,
  ProviderOperationResult,
  ProviderPaymentSnapshot,
  ProviderVerification,
  ProviderWebhookEvent,
  ProviderWebhookRequest,
} from "@/payments/providers/provider";
import type { PaymentEventType } from "@/payments/types/payment-event";
import type { PaymobTransaction, PaymobWebhookBody } from "@/payments/providers/paymob/paymob-types";

/** Paymob's billing_data rejects empty required fields; anything Bosla
 *  genuinely doesn't collect (street, building…) is sent as their
 *  documented "NA" placeholder. */
const NA = "NA";

function classifyTransaction(transaction: PaymobTransaction): PaymentEventType {
  const success = transaction.success === true;
  const pending = transaction.pending === true;
  if (pending) return "unknown";
  if (success) {
    if (transaction.is_voided) return "payment.voided";
    if (transaction.is_refunded || transaction.has_parent_transaction) return "refund.succeeded";
    if (transaction.is_auth && !transaction.is_capture) return "payment.authorized";
    return "payment.succeeded";
  }
  if (transaction.has_parent_transaction) return "refund.failed";
  return "payment.failed";
}

function parseBody(rawBody: string): PaymobWebhookBody {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as PaymobWebhookBody) : {};
  } catch {
    return {};
  }
}

function operationResult(transaction: PaymobTransaction): ProviderOperationResult {
  return {
    providerReference: transaction.id !== undefined ? String(transaction.id) : null,
    status: transaction.success === true && transaction.pending !== true ? "succeeded" : "pending",
    raw: transaction as Record<string, unknown>,
  };
}

/**
 * The Paymob adapter — Bosla's first production provider (launch market:
 * Egypt). Checkout rides Paymob's Intention API + hosted Unified
 * Checkout; webhooks are the "Transaction processed callback" verified
 * via Paymob's SHA-512 field-concatenation HMAC
 * (`paymob-hmac.ts`); refund/capture/void ride the legacy Acceptance
 * API. Everything Paymob-shaped stays inside this directory — the rest
 * of the platform sees only `PaymentProviderAdapter`'s normalized
 * types.
 */
export class PaymobProvider implements PaymentProviderAdapter {
  readonly id = "paymob";
  readonly capabilities = { refund: true, partialRefund: true, capture: true, void: true };

  private readonly client: PaymobClient;

  constructor(private readonly env: PaymobEnv) {
    this.client = new PaymobClient(env);
  }

  async createCheckout(params: ProviderCheckoutParams): Promise<ProviderCheckoutSession> {
    const amountCents = toMinorUnits(params.amount, params.currency);
    const integrationIds = this.env.PAYMOB_INTEGRATION_IDS.split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (integrationIds.length === 0) {
      throw new Error("PAYMOB_INTEGRATION_IDS contains no valid integration id.");
    }

    const intention = await this.client.createIntention({
      amount: amountCents,
      currency: params.currency,
      payment_methods: integrationIds,
      items: [
        {
          name: params.description.slice(0, 50) || "Course",
          amount: amountCents,
          description: params.description.slice(0, 255),
          quantity: 1,
        },
      ],
      billing_data: {
        first_name: params.customer.firstName || NA,
        last_name: params.customer.lastName || NA,
        email: params.customer.email,
        phone_number: params.customer.phone || NA,
        apartment: NA,
        building: NA,
        street: NA,
        floor: NA,
        city: NA,
        state: NA,
        country: NA,
        postal_code: NA,
      },
      customer: {
        first_name: params.customer.firstName || NA,
        last_name: params.customer.lastName || NA,
        email: params.customer.email,
      },
      /** Becomes the Accept order's `merchant_order_id` — how every
       *  webhook is matched back to our `payments.id`. */
      special_reference: params.paymentId,
      redirection_url: params.returnUrl,
      extras: { payment_id: params.paymentId, order_id: params.orderId },
    });

    if (!intention.client_secret) {
      throw new Error("Paymob intention response carried no client_secret.");
    }

    return {
      providerPaymentId: intention.id !== undefined ? String(intention.id) : params.paymentId,
      redirectUrl: this.client.unifiedCheckoutUrl(intention.client_secret),
      raw: intention as Record<string, unknown>,
    };
  }

  async verifyWebhook(request: ProviderWebhookRequest): Promise<ProviderVerification> {
    const receivedHmac = new URL(request.url).searchParams.get("hmac");
    if (!receivedHmac) {
      return { verified: false, reason: "missing hmac query parameter" };
    }
    const body = parseBody(request.rawBody);
    if (!body.obj || body.type !== "TRANSACTION") {
      return { verified: false, reason: "not a TRANSACTION callback" };
    }
    const verified = verifyPaymobTransactionHmac(body.obj, receivedHmac, this.env.PAYMOB_HMAC_SECRET);
    return verified ? { verified: true } : { verified: false, reason: "hmac mismatch" };
  }

  parseWebhook(request: ProviderWebhookRequest): ProviderWebhookEvent {
    const body = parseBody(request.rawBody);
    const transaction = body.obj;
    if (!transaction) {
      return {
        eventType: "unknown",
        providerEventId: null,
        providerPaymentId: null,
        providerTransactionId: null,
        merchantReference: null,
        amount: null,
        currency: null,
        paymentMethod: null,
        raw: body as Record<string, unknown>,
      };
    }

    const currency = transaction.currency ?? null;
    const extras = transaction.payment_key_claims?.extra;
    const extrasPaymentId = extras && typeof extras["payment_id"] === "string" ? (extras["payment_id"] as string) : null;

    return {
      eventType: classifyTransaction(transaction),
      providerEventId: transaction.id !== undefined ? String(transaction.id) : null,
      providerPaymentId: null,
      providerTransactionId: transaction.id !== undefined ? String(transaction.id) : null,
      merchantReference: transaction.order?.merchant_order_id ?? extrasPaymentId,
      amount:
        transaction.amount_cents !== undefined && currency
          ? fromMinorUnits(transaction.amount_cents, currency)
          : null,
      currency,
      paymentMethod: transaction.source_data?.type ?? null,
      raw: body as Record<string, unknown>,
    };
  }

  async retrievePayment(providerTransactionId: string): Promise<ProviderPaymentSnapshot> {
    const transaction = await this.client.retrieveTransaction(providerTransactionId);
    const currency = transaction.currency ?? null;
    return {
      providerTransactionId: transaction.id !== undefined ? String(transaction.id) : null,
      eventType: classifyTransaction(transaction),
      amount:
        transaction.amount_cents !== undefined && currency
          ? fromMinorUnits(transaction.amount_cents, currency)
          : null,
      currency,
      raw: transaction as Record<string, unknown>,
    };
  }

  async refund(params: { providerTransactionId: string; amount: string; currency: string }): Promise<ProviderOperationResult> {
    const transaction = await this.client.refund(params.providerTransactionId, toMinorUnits(params.amount, params.currency));
    return operationResult(transaction);
  }

  async capture(params: { providerTransactionId: string; amount: string; currency: string }): Promise<ProviderOperationResult> {
    const transaction = await this.client.capture(params.providerTransactionId, toMinorUnits(params.amount, params.currency));
    return operationResult(transaction);
  }

  async void(params: { providerTransactionId: string }): Promise<ProviderOperationResult> {
    const transaction = await this.client.void(params.providerTransactionId);
    return operationResult(transaction);
  }
}
