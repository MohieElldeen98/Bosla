/**
 * Shared by `NotificationRepository.update` (`markAsRead`'s optimistic
 * concurrency) — a plain `T | null` can't distinguish "no row with this
 * id" from "a row exists but its `updated_at` no longer matches what the
 * caller expected" (someone else — another open tab — already marked it
 * read first), and callers need to react differently to each (`not_found`
 * vs `conflict` map to different `NotificationActionResult` codes). Own
 * copy per this codebase's per-domain convention (see
 * `cms/types/repository-result.ts`, `courses/types/repository-result.ts`).
 */
export type OptimisticUpdateResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "conflict" };
