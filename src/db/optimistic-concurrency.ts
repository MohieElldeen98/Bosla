import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * The `WHERE` condition every repository's optimistic-concurrency `update`
 * uses to check "has this row changed since the caller last read it" —
 * every `updated_at` column is a microsecond-precision `timestamptz`, but
 * `expectedUpdatedAt` always round-trips through a JS `Date` first (the
 * client read the row, serialized `updatedAt` to an ISO string via
 * `.toISOString()`, and sends that string back here) — and a JS `Date`
 * cannot represent anything finer than milliseconds. A plain `eq(column,
 * new Date(expectedUpdatedAt))` therefore only matches a row whose stored
 * timestamp happens to carry zero microseconds, which is not guaranteed
 * for a row written by anything other than this app's own `new Date()`
 * writes (raw-SQL seed/import data, a future migration, Postgres's own
 * `now()` column default on an insert that doesn't override it) — every
 * other row fails the check forever, reporting a conflict that never
 * happened.
 *
 * `date_trunc('milliseconds', ...)` on both sides fixes this by comparing
 * at the same precision the client baseline actually has. It specifically
 * has to be `date_trunc` (a floor) and not a `::timestamptz(3)` cast (a
 * round) — verified empirically (see the audit this helper came out of):
 * postgres.js itself *truncates*, not rounds, when it parses a
 * microsecond-precision column into the `Date` the client's baseline is
 * built from, so a round-based reduction would disagree with the
 * driver's own truncation for any row whose microsecond remainder is
 * >= 500 — reintroducing false conflicts in the opposite direction for
 * genuinely unconflicted saves.
 *
 * No index concern: every caller ANDs this with an `eq(table.id, id)`
 * (or an equivalent unique-key equality) as the first condition, so
 * Postgres locates the row via the primary-key index regardless — this
 * condition is only ever evaluated as a post-lookup filter on the single
 * already-found row, never as an index scan predicate. None of the
 * affected tables have an index on `updated_at` in the first place.
 */
export function timestampMatches(column: AnyPgColumn, expectedUpdatedAt: string): SQL {
  return sql`date_trunc('milliseconds', ${column}) = date_trunc('milliseconds', ${expectedUpdatedAt}::timestamptz)`;
}
