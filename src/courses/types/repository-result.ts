/**
 * The Course Domain's own copy of `cms/types/repository-result.ts`'s
 * `OptimisticUpdateResult<T>` — same shape, kept separate per this
 * codebase's "own copy per domain" convention (see
 * `courses/utils/safe-operation.ts`). Lets `CourseRepository.update`
 * distinguish "no row with this id" (`not_found`) from "a row exists but
 * its `updated_at` no longer matches what the caller expected" (`conflict`
 * — someone else changed it first), which a plain `T | null` can't.
 */
export type OptimisticUpdateResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "conflict" };
