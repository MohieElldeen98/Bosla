const isDev = process.env.NODE_ENV !== "production";

/**
 * Development-only logging — every method is a no-op in production so
 * expected failure paths (a caught Supabase error, a missing env var)
 * never reach production console output. Use this instead of bare
 * `console.*` anywhere in `src/auth/**` or `src/lib/**`.
 */
export const logger = {
  info(...args: unknown[]): void {
    if (isDev) console.info(...args);
  },
  warn(...args: unknown[]): void {
    if (isDev) console.warn(...args);
  },
  error(...args: unknown[]): void {
    if (isDev) console.error(...args);
  },
};
