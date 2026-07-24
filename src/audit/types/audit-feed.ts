/**
 * Every audit source `AuditFeedService` fans out to — one entry per
 * existing per-domain audit table (`docs/database-overview.md` §6's
 * "planned" cross-domain `audit_logs` never replaced these; each domain
 * kept its own). Adding a 14th audit table later means adding one more
 * key here and one more case in `AuditFeedService`'s domain-fetcher map
 * — never a schema change to this list itself.
 */
export const AUDIT_DOMAINS = [
  "article",
  "media",
  "cms",
  "course",
  "category",
  "order",
  "coupon",
  "instructorProfile",
  "learning",
  "revenue",
  "siteSettings",
  "navigation",
  "profile",
] as const;
export type AuditDomain = (typeof AUDIT_DOMAINS)[number];

/**
 * One row, normalized across every domain's own (differently-shaped)
 * audit entry type — the shape `AuditFeedService` returns. `entityId` is
 * each domain's primary anchor (`courseId`/`articleId`/`settingKey`/...,
 * `null` only where the source table's own anchor is nullable, e.g.
 * `navigation`'s deleted-item rows or `revenue`'s system-level entries).
 * Secondary domain-specific columns that don't fit this shape
 * (`cms`'s `sectionId`, `learning`'s `moduleId`/`lessonId`, `order`'s
 * `paymentId`/`actorType`/`message`, `revenue`'s `entityType`) are folded
 * into `metadata` rather than dropped — see `AuditFeedService`'s
 * per-domain mapping.
 */
export interface AuditFeedEntry {
  id: string;
  domain: AuditDomain;
  action: string;
  entityId: string | null;
  actorId: string | null;
  /** Batch-resolved from `profiles` (`ProfileRepository.findByUserIds`)
   *  — `null` when `actorId` is `null` (a system-initiated action) or
   *  when the actor's profile row itself couldn't be resolved. */
  actorName: string | null;
  actorEmail: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface AuditFeedFilters {
  /** Which domains to fan out to — omit or empty for every domain. */
  domains?: AuditDomain[];
  actorId?: string;
  action?: string;
  /** Free-text search — see `AuditLogSearchFilters.query`'s doc comment
   *  (`db/audit-search.ts`) for why this searches `action`, not `metadata`. */
  query?: string;
  /** Inclusive lower bound, ISO 8601. */
  dateFrom?: string;
  /** Inclusive upper bound, ISO 8601. */
  dateTo?: string;
  /** Omit for the first page. */
  cursor?: AuditFeedCursor;
  /** Defaults to 20, capped at 100 — see `AuditFeedService`. */
  limit?: number;
}

export interface AuditFeedCursor {
  createdAt: string;
  id: string;
}

export interface AuditFeedResult {
  entries: AuditFeedEntry[];
  /** Pass back as `filters.cursor` for the next page; `null` on the last
   *  page. */
  nextCursor: AuditFeedCursor | null;
  hasMore: boolean;
}
