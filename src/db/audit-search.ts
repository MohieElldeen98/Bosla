import { and, desc, eq, gte, ilike, lt, lte, or, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * The filter/pagination request every domain's audit-log `search()`
 * method accepts — actor/action/free-text/date-range filters plus
 * keyset ("seek") pagination via `cursor`. Shared once instead of
 * hand-copied per domain (same "one small shared helper, not a shared
 * table" precedent as `timestampMatches` — see
 * `db/optimistic-concurrency.ts`): the filter *shape* is pure plumbing,
 * not a domain concept, unlike the audit tables themselves, which stay
 * one-per-domain.
 */
export interface AuditLogSearchFilters {
  actorId?: string;
  action?: string;
  /** Free-text search — matched against `action` (the one consistently
   *  populated, low-cardinality text field every audit table has;
   *  `metadata` is sparse/shaped differently per action, not a
   *  meaningful search target). */
  query?: string;
  /** Inclusive lower bound, ISO 8601. */
  dateFrom?: string;
  /** Inclusive upper bound, ISO 8601. */
  dateTo?: string;
  /** Keyset cursor — "rows strictly older than this position," in the
   *  same `(createdAt DESC, id DESC)` total order every `search()`
   *  method sorts by. `id` breaks ties between same-millisecond rows;
   *  it carries no meaning beyond producing a stable order. */
  cursor?: { createdAt: string; id: string };
  /** Callers should request `desired page size + 1` — a `search()`
   *  result with more than the desired count unambiguously means
   *  more rows exist beyond this page (see `AuditFeedService`). */
  limit: number;
}

interface AuditSearchColumns {
  id: AnyPgColumn;
  actorId: AnyPgColumn;
  action: AnyPgColumn;
  createdAt: AnyPgColumn;
}

/**
 * Builds the `WHERE` conditions for an audit `search()` query against
 * whichever table's columns are passed in. Every caller ANDs the result
 * with `and(...conditions)` (or passes `undefined` to `.where()` when
 * empty) and sorts by `desc(columns.createdAt), desc(columns.id)` —
 * the cursor condition here assumes that exact order.
 */
export function buildAuditSearchConditions(columns: AuditSearchColumns, filters: AuditLogSearchFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.actorId) conditions.push(eq(columns.actorId, filters.actorId));
  if (filters.action) conditions.push(eq(columns.action, filters.action));
  if (filters.query) conditions.push(ilike(columns.action, `%${filters.query}%`));
  if (filters.dateFrom) conditions.push(gte(columns.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(columns.createdAt, new Date(filters.dateTo)));
  if (filters.cursor) {
    // `cursorCreatedAt` only carries millisecond precision — it was
    // rebuilt from an ISO string produced by `Date.prototype
    // .toISOString()`, and a JS `Date` cannot represent anything finer
    // (the same limitation `timestampMatches` documents for optimistic-
    // concurrency checks — see `db/optimistic-concurrency.ts`). The
    // stored `createdAt` column is `timestamptz` at microsecond
    // precision, so comparing the raw column against this cursor with a
    // plain `eq` would silently and *permanently* drop any row sharing
    // the cursor's millisecond but carrying a nonzero microsecond
    // remainder: such a row satisfies neither `< cursor` (its raw value
    // is numerically >= the truncated cursor) nor `= cursor` (it isn't
    // exactly equal at full precision) — verified empirically against a
    // real cross-table tie (two rows 800µs apart, same millisecond) that
    // a plain `eq` genuinely lost.
    //
    // Comparing against the half-open bucket [cursor, cursor + 1ms)
    // instead of exact equality closes that gap — every row sharing the
    // cursor's millisecond falls in the bucket regardless of its
    // microsecond remainder, and the `id` tiebreak (the same one
    // `ORDER BY` and the JS-side merge in `AuditFeedService` already use)
    // then decides its place deterministically. This stays a perfectly
    // ordinary sargable range predicate — unlike `date_trunc(...)`, which
    // would defeat the plain `created_at`/`(actor_id, created_at)`
    // indexes for both this condition and the `ORDER BY`.
    const cursorCreatedAt = new Date(filters.cursor.createdAt);
    const cursorBucketEnd = new Date(cursorCreatedAt.getTime() + 1);
    conditions.push(
      or(
        lt(columns.createdAt, cursorCreatedAt),
        and(
          gte(columns.createdAt, cursorCreatedAt),
          lt(columns.createdAt, cursorBucketEnd),
          lt(columns.id, filters.cursor.id),
        ),
      ) as SQL,
    );
  }
  return conditions;
}

/**
 * The matching `ORDER BY` — always paired with `buildAuditSearchConditions`.
 * Sorts by the *raw* (full microsecond precision) column, not the
 * millisecond-bucketed comparison the cursor condition uses — deliberately:
 * an expression-based sort (`date_trunc(...)`) would make both this and the
 * cursor condition non-sargable, defeating the plain `created_at`/
 * `(actor_id, created_at)` indexes entirely, to guard against a case that's
 * already extremely narrow. The one residual gap this leaves: if a single
 * table ever produced *more* same-millisecond rows than one page's fetch
 * window (`limit + 1` — see `AuditFeedService`), the raw-precision ranking
 * used here to decide that fetch window could disagree with the `id`-based
 * ordering the cursor condition and the cross-table JS merge fall back to
 * once truncated — a row could then be mis-ordered relative to that
 * fallback. This requires a burst of writes to one audit table within a
 * single millisecond exceeding the page size, which no code path in this
 * codebase currently produces; accepted as a known limitation rather than
 * fixed, matching `timestampMatches`'s own "No index concern" precedent for
 * when a tradeoff is worth documenting instead of engineering away.
 */
export function auditSearchOrderBy(columns: Pick<AuditSearchColumns, "createdAt" | "id">) {
  return [desc(columns.createdAt), desc(columns.id)];
}
