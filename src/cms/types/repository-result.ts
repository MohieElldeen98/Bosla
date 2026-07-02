/**
 * Shared by every repository `update` that supports optimistic
 * concurrency (Step 6.6 — docs/cms-overview.md §16): a plain `T | null`
 * can't distinguish "no row with this id" from "a row exists but its
 * `updated_at` no longer matches what the caller expected" (someone else
 * changed it first), and callers need to react differently to each
 * (`not_found` vs `conflict` map to different `CmsActionResult` codes).
 */
export type OptimisticUpdateResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "conflict" };
