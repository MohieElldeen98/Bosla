/**
 * The Commerce Domain's own copy of `learning/types/repository-result.ts`'s
 * `OptimisticUpdateResult<T>` — same shape, kept separate per this
 * codebase's "own copy per domain" convention. Lets a repository's
 * `update` distinguish "no row with this id" (`not_found`) from "a row
 * exists but its `updated_at` no longer matches what the caller
 * expected" (`conflict`).
 */
export type OptimisticUpdateResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "conflict" };
