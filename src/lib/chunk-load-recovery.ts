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
 * Guarded via `sessionStorage` so a chunk that's genuinely unavailable
 * (not just slow) reloads once, then falls through to the normal error UI
 * instead of looping forever.
 */
const RELOAD_GUARD_KEY = "bosla:chunk-reload-attempted";

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "ChunkLoadError" || /Loading (chunk|CSS chunk) \S+ failed/.test(error.message);
}

export function recoverFromChunkLoadError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;

  let alreadyAttempted = false;
  try {
    alreadyAttempted = window.sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
  } catch {
    // Private browsing / storage disabled — treat as not-yet-attempted;
    // worst case is a single extra reload rather than getting stuck.
  }
  if (alreadyAttempted) return false;

  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  } catch {}
  window.location.reload();
  return true;
}
