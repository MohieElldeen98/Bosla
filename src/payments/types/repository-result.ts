/**
 * The Payment Platform's own copy of `commerce/types/repository-result.ts`'s
 * `OptimisticUpdateResult<T>` — same shape, kept separate per this
 * codebase's "own copy per domain" convention.
 */
export type OptimisticUpdateResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "conflict" };
