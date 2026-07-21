/**
 * Payment attempt lifecycle knobs (docs/payment-platform.md
 * §Expiration). `PAYMENT_ATTEMPT_TTL_MINUTES` — how long a fresh
 * attempt stays `pending` before it's eligible for the expiry sweep
 * (`PaymentExpiryService`) to become `expired`. Read lazily, same
 * "no env-schema ceremony" convention `getRevenueHoldDays`
 * (`commerce/revenue/revenue-config.ts`) established — a malformed
 * value falls back to the default rather than failing checkout.
 */
const DEFAULT_TTL_MINUTES = 30;

export function getPaymentAttemptTtlMinutes(): number {
  const raw = Number(process.env.PAYMENT_ATTEMPT_TTL_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TTL_MINUTES;
  return Math.floor(raw);
}

export function computeAttemptExpiry(now = new Date()): Date {
  return new Date(now.getTime() + getPaymentAttemptTtlMinutes() * 60 * 1000);
}
