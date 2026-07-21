/**
 * Revenue Platform knobs. `REVENUE_HOLD_DAYS` — how long an
 * instructor's share stays `pending` (the refund-risk window) before it
 * matures into `available` and becomes payable. 0 = immediately
 * available. Read lazily so tests/deploys can vary it without an
 * env-schema ceremony; a malformed value falls back to the default.
 */
const DEFAULT_HOLD_DAYS = 14;

export function getRevenueHoldDays(): number {
  const raw = Number(process.env.REVENUE_HOLD_DAYS);
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_HOLD_DAYS;
  return Math.floor(raw);
}

export function getMaturityCutoff(now = new Date()): Date {
  return new Date(now.getTime() - getRevenueHoldDays() * 24 * 60 * 60 * 1000);
}
