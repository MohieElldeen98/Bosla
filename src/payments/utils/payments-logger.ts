/**
 * Structured observability for the money path — unlike `lib/logger`
 * (dev-only by design), payment lifecycle events MUST be visible in
 * production: they are how a disputed charge, a stuck webhook, or an
 * amount mismatch gets diagnosed after the fact. One JSON line per
 * event, greppable by `"scope":"payments"` and `event`.
 *
 * Never log secrets or full card data here — provider payloads are
 * already persisted (access-controlled) in `payment_events`; log
 * identifiers and outcomes, not payloads.
 */
type LogFields = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", event: string, fields: LogFields): void {
  const line = JSON.stringify({
    scope: "payments",
    level,
    event,
    at: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const paymentsLogger = {
  info: (event: string, fields: LogFields = {}) => emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => emit("error", event, fields),
};
