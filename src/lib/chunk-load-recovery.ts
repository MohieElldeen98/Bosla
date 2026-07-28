/**
 * Next.js code-splits into many small chunks fetched on demand; on a slow
 * or unstable connection (confirmed in production via a captured iPhone/
 * Safari report — Vodafone EG, 2 signal bars) that fetch can time out
 * instead of failing fast, surfacing as an uncaught `ChunkLoadError` with
 * no built-in retry. A stale chunk hash after a new deploy is the other
 * common cause. Either way, a full reload re-fetches the current asset
 * manifest and resolves it — so recover automatically instead of stranding
 * the visitor on the error boundary.
 *
 * Guarded via a timestamp in `sessionStorage`, not a permanent one-shot
 * flag: webpack's own chunk-load timeout is already a generous 120s (a
 * failure means the connection was down for that whole window, confirmed
 * in the production report above — not a misconfigured timeout), so a
 * user on a sustained-but-intermittent connection can hit this more than
 * once in a session, minutes apart. A flat "never again this session"
 * guard would leave them stuck manually retrying for the rest of their
 * visit after the first failure. A short cooldown still stops a tight
 * reload loop (repeated failures seconds apart) while letting a later,
 * independent failure get its own automatic recovery attempt.
 */
const RELOAD_GUARD_KEY = "bosla:chunk-reload-at";
const RELOAD_COOLDOWN_MS = 60_000;

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "ChunkLoadError" || /Loading (chunk|CSS chunk) \S+ failed/.test(error.message);
}

export function recoverFromChunkLoadError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;

  let withinCooldown = false;
  try {
    const lastAttempt = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY));
    withinCooldown = Number.isFinite(lastAttempt) && Date.now() - lastAttempt < RELOAD_COOLDOWN_MS;
  } catch {
    // Private browsing / storage disabled — treat as not-on-cooldown;
    // worst case is a single extra reload rather than getting stuck.
  }
  if (withinCooldown) return false;

  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}
