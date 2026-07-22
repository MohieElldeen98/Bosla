/**
 * Structured observability for the job queue — mirrors
 * `src/payments/utils/payments-logger.ts` exactly, same reasoning:
 * unlike `lib/logger` (dev-only by design), a job burning through its
 * retries or a batch of jobs getting reclaimed from a dead function must
 * stay visible in production — it's how a stuck upload or a broken
 * pipeline gets diagnosed. One JSON line per event, greppable by
 * `"scope":"jobs"` and `event`. `job_queue.last_error`/`status` is the
 * durable record either way; this is the real-time signal.
 */
type LogFields = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", event: string, fields: LogFields): void {
  const line = JSON.stringify({
    scope: "jobs",
    level,
    event,
    at: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const jobsLogger = {
  info: (event: string, fields: LogFields = {}) => emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => emit("error", event, fields),
};
