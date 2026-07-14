/**
 * The Blog domain's own copy of `courses/types/repository-result.ts`'s
 * `OptimisticUpdateResult<T>` — same shape, kept separate per the
 * "own copy per domain" convention (see `blog/utils/safe-operation.ts`).
 */
export type OptimisticUpdateResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "conflict" };
