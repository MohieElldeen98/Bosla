import "server-only";

import { paymentEnv, paymobEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { PaymobProvider } from "@/payments/providers/paymob/paymob.provider";
import type { PaymentProviderAdapter } from "@/payments/providers/provider";

export type {
  PaymentProviderAdapter,
  ProviderCheckoutParams,
  ProviderCheckoutSession,
  ProviderWebhookEvent,
  ProviderWebhookRequest,
  ProviderVerification,
  ProviderOperationResult,
  ProviderCapabilities,
} from "@/payments/providers/provider";

/** Each entry constructs one adapter (or `null` when its own env is
 *  missing). Adding a provider = one entry here + its directory — the
 *  whole point of the platform (docs/payment-platform.md §"Adding a
 *  provider"). Nothing outside `src/payments/providers/` ever names a
 *  provider. */
const PROVIDER_FACTORIES: Record<string, () => PaymentProviderAdapter | null> = {
  paymob: () => (paymobEnv ? new PaymobProvider(paymobEnv) : null),
};

let activeInstance: PaymentProviderAdapter | null | undefined;

/**
 * The active provider, selected by `PAYMENT_PROVIDER` — the ONE place a
 * concrete adapter is chosen, mirroring `media/storage`'s
 * `getMediaStorage()`. `null` means "online payments are not
 * configured": checkout reports itself unavailable for paid courses
 * (free enrollment still works), webhooks 404 — a graceful feature-off,
 * never a crash.
 */
export function getActivePaymentProvider(): PaymentProviderAdapter | null {
  if (activeInstance !== undefined) return activeInstance;
  if (!paymentEnv) {
    activeInstance = null;
    return activeInstance;
  }
  const factory = PROVIDER_FACTORIES[paymentEnv.PAYMENT_PROVIDER];
  if (!factory) {
    logger.warn(
      `[payments] PAYMENT_PROVIDER="${paymentEnv.PAYMENT_PROVIDER}" has no registered adapter — ` +
        `known providers: ${Object.keys(PROVIDER_FACTORIES).join(", ")}. Online payments stay disabled.`,
    );
    activeInstance = null;
    return activeInstance;
  }
  activeInstance = factory();
  return activeInstance;
}

/** Adapter lookup by id for the webhook route — a webhook must be
 *  verified by the provider that sent it even if the ACTIVE provider
 *  was just switched (in-flight payments from the previous provider
 *  still finish correctly). */
export function getPaymentProviderById(providerId: string): PaymentProviderAdapter | null {
  const factory = PROVIDER_FACTORIES[providerId];
  return factory ? factory() : null;
}
