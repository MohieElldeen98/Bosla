import { ArticleAuditLogRepository } from "@/blog/repositories/article-audit-log.repository";
import { MediaAuditLogRepository } from "@/cms/repositories/media-audit-log.repository";
import { CmsAuditLogRepository } from "@/cms/repositories/audit-log.repository";
import { CourseAuditLogRepository } from "@/courses/repositories/course-audit-log.repository";
import { CategoryAuditLogRepository } from "@/courses/repositories/category-audit-log.repository";
import { OrderAuditLogRepository } from "@/commerce/repositories/order-audit-log.repository";
import { CouponAuditLogRepository } from "@/commerce/repositories/coupon-audit-log.repository";
import { InstructorProfileAuditLogRepository } from "@/instructor/repositories/instructor-profile-audit-log.repository";
import { LearningAuditLogRepository } from "@/learning/repositories/audit-log.repository";
import { RevenueAuditLogRepository } from "@/commerce/repositories/revenue-audit-log.repository";
import { SiteSettingsAuditLogRepository } from "@/cms/repositories/site-settings-audit-log.repository";
import { NavigationAuditLogRepository } from "@/cms/repositories/navigation-audit-log.repository";
import { ProfileAuditLogRepository } from "@/auth/repositories/profile-audit-log.repository";
import { ProfileRepository } from "@/auth/repositories/profile.repository";
import { requireAuditAccess } from "@/audit/utils/require-audit-access";
import { logger } from "@/lib/logger";
import { AUDIT_DOMAINS } from "@/audit/types/audit-feed";
import type { AuditLogSearchFilters } from "@/db/audit-search";
import type { AuditDomain, AuditFeedCursor, AuditFeedEntry, AuditFeedFilters, AuditFeedResult } from "@/audit/types/audit-feed";
import type { AuditActionResult } from "@/audit/types/result";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** A single audit row, normalized to `AuditFeedEntry`'s shape but without
 *  `actorName`/`actorEmail`/`actorAvatarUrl` yet (resolved once, in bulk,
 *  after the merge — see `resolveActors`). */
type NormalizedRow = Omit<AuditFeedEntry, "domain" | "actorName" | "actorEmail" | "actorAvatarUrl">;

async function safeSearch<T extends { id: string; action: string; actorId: string | null; createdAt: string; metadata: Record<string, unknown> }>(
  domain: AuditDomain,
  search: () => Promise<T[]>,
  toRow: (entry: T) => NormalizedRow,
): Promise<NormalizedRow[]> {
  try {
    const entries = await search();
    return entries.map(toRow);
  } catch (error) {
    // One domain's table erroring (a transient DB issue, a bad filter for
    // that table's specific column set) must not take down the other 12 —
    // mirrors `UserAdminService.getActivityFeed`'s `safeRead` per-source
    // resilience, just generalized to 13 sources instead of 3.
    logger.error(`[audit-feed] ${domain} search failed`, error);
    return [];
  }
}

/** One fetcher per `AuditDomain` — calls that domain's own repository's
 *  `search()` and normalizes its entry shape to `NormalizedRow`. Secondary
 *  columns a domain has beyond the common shape (`cms`'s `sectionId`,
 *  `learning`'s `moduleId`/`lessonId`, `order`'s `paymentId`/`actorType`/
 *  `message`, `revenue`'s `entityType`) are folded into `metadata` rather
 *  than dropped. */
const DOMAIN_FETCHERS: Record<AuditDomain, (filters: AuditLogSearchFilters) => Promise<NormalizedRow[]>> = {
  article: (filters) =>
    safeSearch("article", () => ArticleAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.articleId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  media: (filters) =>
    safeSearch("media", () => MediaAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.mediaAssetId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  cms: (filters) =>
    safeSearch("cms", () => CmsAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.pageId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: { ...r.metadata, sectionId: r.sectionId },
    })),
  course: (filters) =>
    safeSearch("course", () => CourseAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.courseId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  category: (filters) =>
    safeSearch("category", () => CategoryAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.categoryId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  order: (filters) =>
    safeSearch("order", () => OrderAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.orderId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: { ...r.metadata, paymentId: r.paymentId, actorType: r.actorType, message: r.message },
    })),
  coupon: (filters) =>
    safeSearch("coupon", () => CouponAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.couponId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  instructorProfile: (filters) =>
    safeSearch("instructorProfile", () => InstructorProfileAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.instructorProfileId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  learning: (filters) =>
    safeSearch("learning", () => LearningAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.courseId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: { ...r.metadata, moduleId: r.moduleId, lessonId: r.lessonId },
    })),
  revenue: (filters) =>
    safeSearch("revenue", () => RevenueAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.entityId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: { ...r.metadata, entityType: r.entityType },
    })),
  siteSettings: (filters) =>
    safeSearch("siteSettings", () => SiteSettingsAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.settingKey,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  navigation: (filters) =>
    safeSearch("navigation", () => NavigationAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.navigationItemId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
  profile: (filters) =>
    safeSearch("profile", () => ProfileAuditLogRepository.search(filters), (r) => ({
      id: r.id,
      action: r.action,
      entityId: r.targetUserId,
      actorId: r.actorId,
      createdAt: r.createdAt,
      metadata: r.metadata,
    })),
};

/** Total order every domain's `search()` already sorts by
 *  (`createdAt DESC, id DESC` — see `db/audit-search.ts`) — used again
 *  here to merge the per-domain result sets back into one sequence. */
function compareNewestFirst(a: NormalizedRow, b: NormalizedRow): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

async function resolveActors(
  rows: NormalizedRow[],
): Promise<Map<string, { name: string | null; email: string; avatarUrl: string | null }>> {
  const actorIds = [...new Set(rows.map((r) => r.actorId).filter((id): id is string => id !== null))];
  if (actorIds.length === 0) return new Map();
  // `findByUserIds` already selects every `profiles` column (no
  // projection) in this one batch call — `avatarUrl` is already sitting
  // on each `p` below, just not read out until now. No second query.
  const profiles = await ProfileRepository.findByUserIds(actorIds);
  return new Map(
    profiles.map((p) => [p.userId, { name: p.displayName ?? p.fullName, email: p.email, avatarUrl: p.avatarUrl }]),
  );
}

/**
 * The merged, filterable, cursor-paginated read over every per-domain
 * audit table — backend for the future Audit Viewer (not built yet).
 * Keeps the "own table per domain, compose at the service layer" rule
 * every audit table's own doc comment already states: this fans out to
 * 13 repositories in parallel and merges in memory, exactly like
 * `UserAdminService.getActivityFeed` already does for 3 — it does not
 * introduce a unified table or a cross-domain SQL join.
 *
 * Pagination correctness: each domain is asked for `limit + 1` rows
 * older than the cursor (not just "the top `limit` again," which is
 * `getActivityFeed`'s known limitation — correct only for an unpaginated
 * "recent activity" list, not a real page 2+). Fetching `limit + 1` per
 * domain guarantees the true global top-`limit` is a subset of the
 * merged candidates (if a row is outside domain X's own top-`limit+1`,
 * at least `limit + 1` rows from X alone are newer than it, so it can't
 * be in the global top-`limit` either) — a standard federated/keyset
 * merge. `hasMore` is then simply "did the merged candidate pool exceed
 * `limit`" — unambiguous, because any domain returning fewer than
 * `limit + 1` rows has definitively shown everything it has left below
 * the cursor.
 */
export const AuditFeedService = {
  async search(filters: AuditFeedFilters = {}): Promise<AuditActionResult<AuditFeedResult>> {
    const user = await requireAuditAccess();
    if (!user) {
      return { success: false, code: "forbidden", message: "Only a Super Admin can view the audit log." };
    }

    try {
      const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const domains = filters.domains && filters.domains.length > 0 ? filters.domains : AUDIT_DOMAINS;

      const repoFilters: AuditLogSearchFilters = {
        actorId: filters.actorId,
        action: filters.action,
        query: filters.query,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        cursor: filters.cursor,
        // Over-fetch by one per domain — see the pagination-correctness
        // doc comment above.
        limit: limit + 1,
      };

      const perDomain = await Promise.all(
        domains.map(async (domain) => {
          const rows = await DOMAIN_FETCHERS[domain](repoFilters);
          return rows.map((row) => ({ ...row, domain }));
        }),
      );

      const candidates = perDomain.flat().sort(compareNewestFirst);
      const hasMore = candidates.length > limit;
      const page = candidates.slice(0, limit);

      const actorsByUserId = await resolveActors(page);

      const entries: AuditFeedEntry[] = page.map((row) => {
        const actor = row.actorId ? actorsByUserId.get(row.actorId) : undefined;
        return {
          id: row.id,
          domain: row.domain,
          action: row.action,
          entityId: row.entityId,
          actorId: row.actorId,
          actorName: actor?.name ?? null,
          actorEmail: actor?.email ?? null,
          actorAvatarUrl: actor?.avatarUrl ?? null,
          createdAt: row.createdAt,
          metadata: row.metadata,
        };
      });

      const last = page[page.length - 1];
      const nextCursor: AuditFeedCursor | null = hasMore && last ? { createdAt: last.createdAt, id: last.id } : null;

      return { success: true, data: { entries, nextCursor, hasMore } };
    } catch (error) {
      logger.error("[AuditFeedService.search]", error);
      return { success: false, code: "unknown", message: "Could not load the audit feed." };
    }
  },
};
