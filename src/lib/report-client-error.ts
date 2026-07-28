/**
 * Fire-and-forget client-side error reporting to `/api/client-error`, which
 * just logs to the server console (visible in Vercel's function logs) —
 * `src/lib/logger.ts` is a no-op in production by design, so it can't be
 * used here; this is the one path that actually survives production.
 *
 * Uses `sendBeacon` when available (survives page unload/navigation),
 * falling back to a keepalive `fetch` — both are best-effort, never
 * awaited by the caller, and never throw.
 */
export function reportClientError(error: unknown, extra?: { componentStack?: string }): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const digest = (err as Error & { digest?: string }).digest;

    const payload = JSON.stringify({
      message: err.message?.slice(0, 2000) ?? "Unknown error",
      stack: err.stack?.slice(0, 4000),
      digest,
      componentStack: extra?.componentStack?.slice(0, 4000),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/client-error",
        new Blob([payload], { type: "application/json" }),
      );
      if (sent) return;
    }
    if (typeof fetch === "function") {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Reporting must never itself throw and compound the original error.
  }
}
