# `AuditFeedService` — API contract

Backend-only. No UI, server action, or page exists yet — this is the
implementation contract for whoever builds one. Source:
`src/audit/services/audit-feed.service.ts`, `src/audit/types/audit-feed.ts`,
`src/audit/types/result.ts`, `src/audit/utils/require-audit-access.ts`,
`src/db/audit-search.ts`.

## Public service methods

One method.

```ts
AuditFeedService.search(filters?: AuditFeedFilters): Promise<AuditActionResult<AuditFeedResult>>
```

`filters` defaults to `{}` (first page, every domain, no filters). Fans out
in parallel to all 13 per-domain audit repositories' own `search()` methods
and merges the results — it does not query a unified table (none exists)
and does not perform a cross-domain SQL join.

## Input filter type — `AuditFeedFilters`

```ts
interface AuditFeedFilters {
  domains?: AuditDomain[];  // omit/empty = every domain
  actorId?: string;         // exact match
  action?: string;          // exact match
  query?: string;           // free-text, matched against `action` only
  dateFrom?: string;        // ISO 8601, inclusive lower bound
  dateTo?: string;          // ISO 8601, inclusive upper bound
  cursor?: AuditFeedCursor; // omit for page 1
  limit?: number;           // default 20, capped at 100
}

type AuditDomain =
  | "article" | "media" | "cms" | "course" | "category"
  | "order" | "coupon" | "instructorProfile" | "learning" | "revenue"
  | "siteSettings" | "navigation" | "profile";
```

All filters are ANDed together. `domains` selects *which* repositories get
queried; every other filter is applied identically inside each of those
queries.

## Returned type — `AuditActionResult<AuditFeedResult>`

```ts
type AuditActionResult<T> =
  | { success: true; data: T }
  | { success: false; code: "forbidden" | "unknown"; message: string };

interface AuditFeedResult {
  entries: AuditFeedEntry[];
  nextCursor: AuditFeedCursor | null; // null on the last page
  hasMore: boolean;
}

interface AuditFeedEntry {
  id: string;
  domain: AuditDomain;
  action: string;
  entityId: string | null;    // that domain's own anchor — courseId,
                               // articleId, settingKey, navigationItemId
                               // (nullable), revenue's entityId (nullable)
  actorId: string | null;
  actorName: string | null;   // batch-resolved, see below
  actorEmail: string | null;
  createdAt: string;          // ISO 8601, millisecond precision
  metadata: Record<string, unknown>;
}
```

`code: "forbidden"` means the caller isn't a Super Admin. `code: "unknown"`
means something threw inside the try/catch wrapping the whole search (a
single domain's own query failing does *not* produce this — see Known
limitations).

`metadata` also carries whichever secondary columns a domain has beyond the
common shape, so nothing is silently dropped:

| Domain | Extra keys folded into `metadata` |
|---|---|
| `cms` | `sectionId` |
| `learning` | `moduleId`, `lessonId` |
| `order` | `paymentId`, `actorType`, `message` |
| `revenue` | `entityType` |

## Cursor format

```ts
interface AuditFeedCursor {
  createdAt: string; // ISO 8601
  id: string;         // the row's own uuid
}
```

Plain, structured, JSON-serializable — not an opaque/encoded token. Pass
`AuditFeedResult.nextCursor` straight back as `AuditFeedFilters.cursor` for
the next page. A UI/action layer that needs a single URL-safe string can
serialize this trivially (e.g. `JSON.stringify` + `encodeURIComponent`) —
no encoding scheme is imposed at the service level.

## Supported sorting

Newest-first only: `(createdAt DESC, id DESC)`. Not configurable — no
`sortBy`/`sortDirection` filter exists. `id` is a pure tiebreak for rows
sharing a millisecond; it carries no meaning of its own (see the security
note in Known limitations about relying on it for anything beyond
determinism).

## Supported filters

| Filter | Matching | Notes |
|---|---|---|
| `domains` | inclusion list | which repositories are queried; omit for all 13 |
| `actorId` | exact | one specific admin/user |
| `action` | exact | one specific action string, e.g. `"delete"` |
| `dateFrom` / `dateTo` | range, inclusive | independent — either can be used alone |
| `cursor` | keyset position | see Pagination contract |

No `entityId` filter exists (can't yet ask "show me everything about
course X" across domains) — out of scope for what was built; would be a
straightforward additive filter on the existing per-repo `search()` pattern.

## Search behavior

`query` is free-text `ILIKE '%query%'` against **`action` only**. `metadata`
is not searched — its shape varies per action and per domain, so it isn't a
reliable search target. There is no full-text search, no search across
`entityId` or resolved actor name/email.

## Pagination contract

Cursor-based (keyset/"seek"), not offset-based. Correctness invariant:
**no row is ever skipped or duplicated across pages**, verified against
real cross-table data with intentionally tied timestamps (see the
follow-up review that hardened the cursor condition).

Mechanics, for implementers who need to reason about edge cases rather than
just call it:

- Each active domain is queried for `limit + 1` rows past the cursor, not
  `limit` — this guarantees the true global top-`limit` is always a subset
  of what got fetched (a k-way merge argument: any row outside a domain's
  own top-`limit+1` has at least `limit+1` newer rows in that domain alone,
  so it can't be in the global top-`limit` either).
- All candidates from all queried domains are merged and re-sorted in
  memory; the first `limit` become the page.
- `hasMore` is `candidates.length > limit` — unambiguous, since any domain
  returning fewer than `limit + 1` rows has proven it has nothing left.
- `nextCursor` is the last page row's `(createdAt, id)`.
- The per-table `WHERE` cursor condition compares against the half-open
  bucket `[cursor.createdAt, cursor.createdAt + 1ms)`, not exact equality —
  necessary because the cursor's `createdAt` only carries millisecond
  precision (a JS `Date` limitation) while the stored column is
  microsecond-precision `timestamptz`; exact equality would silently drop
  rows sharing the cursor's millisecond with a nonzero microsecond
  remainder. This was found and fixed via empirical testing, not just
  reasoned about.

Page size: `limit` (default 20, max 100) is the number of *entries
returned*, regardless of how many domains are active — asking for `limit:
20` with `domains: ["course"]` and with no `domains` filter (all 13) both
return at most 20 entries.

## Security requirements

`requireAuditAccess()` runs first, unconditionally, inside `search()`
itself — **Super Admin only** (`isRoleAllowed(user.role, ["super_admin"])`),
matching `/admin/users`, `/admin/settings`, `/admin/jobs`'s own bracket. A
signed-out caller or a plain Admin gets `{ success: false, code:
"forbidden", ... }` — no partial data, no entries.

This is the *only* enforcement point today. It is not yet wired into
`admin-nav.ts` (no `superAdminOnly: true` flag exists for an `audit` nav
item, because no such nav item or page exists yet) — whoever builds the
route must also gate the page itself with `requireRole(locale,
["super_admin"])`, matching the sibling system pages, not rely on the
service check alone for the page-load experience (though the service check
means even a direct/bypassed call is still safe).

## Known limitations

- **No entity-title resolution.** Only `actorName`/`actorEmail` are
  batch-resolved (via `ProfileRepository.findByUserIds`, one query per
  page regardless of how many distinct actors appear). `entityId` is a raw
  id — resolving "course abc123" to its title is a UI/action-layer concern,
  following the same batch-lookup pattern.
- **No `entityId` filter** — see Supported filters.
- **Narrow same-millisecond edge case, documented, not fixed:** if a single
  table ever wrote more rows within one exact millisecond than a page's
  fetch window (`limit + 1`), the raw-precision `ORDER BY` used to pick
  that window could rank differently than the `id`-based tiebreak the
  cursor and cross-domain merge fall back to. Fixing this fully would
  require an expression-based sort (`date_trunc(...)`), which would defeat
  the plain `created_at`/`(actor_id, created_at)` indexes for every query,
  not just tied ones — not worth it for a burst pattern no code path in
  this codebase produces. See `auditSearchOrderBy`'s doc comment.
- **One try/catch around the whole `search()` call**, but each domain's
  fetch is *individually* wrapped (`safeSearch`) so one table erroring
  returns `[]` for that domain and logs, rather than failing the entire
  page — a UI should not assume "empty results for domain X" means "no
  data," if it wants to surface partial-failure state it would need
  `AuditFeedService` extended to report which domains failed (not
  currently surfaced).
- **`id` is not meant to carry information** — it's a stable tiebreak only,
  never a stand-in for chronological order once two rows land in the same
  millisecond bucket.
- **No rate limiting / query cost guard.** A `domains: undefined` (all 13),
  wide `dateFrom`/`dateTo`, no other filter query is the most expensive
  shape; acceptable at current data volumes, worth revisiting if any single
  audit table grows very large.
