import { getTranslations } from "next-intl/server";
import { requireRole } from "@/auth/guards/require-role";
import { ErrorState } from "@/components/admin/ErrorState";
import { AuditViewerManager } from "@/components/admin/audit/AuditViewerManager";
import { AuditFeedService } from "@/audit/services/audit-feed.service";
import { ProfileService } from "@/auth/services/profile.service";
import { auditFeedSearchParamsSchema, parseCursorStack } from "@/audit/validators/audit-feed.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The "To" filter is a plain `<input type="date">` producing a bare
 * `YYYY-MM-DD` calendar day. `new Date("2026-07-24")` parses that as UTC
 * midnight — passed straight through as an inclusive upper bound, it
 * would exclude every entry from the selected day itself, not just days
 * after it (found via browser-testing: picking today as "To" hid today's
 * own rows). Widening to that day's last instant is a UI-layer concern,
 * not a backend one — `AuditFeedService`'s `dateTo` contract is a precise
 * ISO 8601 instant, and it honors whatever instant is passed correctly.
 */
function endOfCalendarDay(dateOnly: string | undefined): string | undefined {
  return dateOnly ? `${dateOnly}T23:59:59.999Z` : undefined;
}

/** The number of entries per page — passed explicitly to
 *  `AuditFeedService.search` rather than relying on its own internal
 *  default, since `AuditViewerManager` needs the exact same value to
 *  compute `<Pagination>`'s from/to math. */
const PAGE_SIZE = 20;

/**
 * `/admin/audit` — the merged, cross-domain Audit Viewer (backend built in
 * an earlier step: `AuditFeedService`). Super-Admin-only, same bracket as
 * `/admin/users`/`/admin/settings`/`/admin/jobs` — the service itself
 * enforces this independently too (`requireAuditAccess`), this is
 * defense-in-depth for the page-load experience. URL search params drive
 * every filter/page value, same pattern `/admin/courses`/`/admin/users`
 * already establish; cursor pagination is threaded through the `cursors`
 * param (see `audit-feed.validator.ts`'s doc comment).
 */
export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);
  const rawSearchParams = await searchParams;

  const parsed = auditFeedSearchParamsSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    domain: firstValue(rawSearchParams.domain),
    action: firstValue(rawSearchParams.action),
    actorId: firstValue(rawSearchParams.actorId),
    dateFrom: firstValue(rawSearchParams.dateFrom),
    dateTo: firstValue(rawSearchParams.dateTo),
  });
  const filters = parsed.success ? parsed.data : {};
  const cursorStack = parseCursorStack(firstValue(rawSearchParams.cursors));

  const [tNav, searchResult, adminUserIds] = await Promise.all([
    getTranslations("Admin.nav.audit"),
    AuditFeedService.search({
      domains: filters.domain ? [filters.domain] : undefined,
      actorId: filters.actorId,
      action: filters.action,
      query: filters.query,
      dateFrom: filters.dateFrom,
      dateTo: endOfCalendarDay(filters.dateTo),
      cursor: cursorStack[cursorStack.length - 1],
      limit: PAGE_SIZE,
    }),
    ProfileService.listAdminUserIds(),
  ]);

  const adminProfiles = await ProfileService.getByUserIds(adminUserIds);
  const actorOptions = adminProfiles
    .map((profile) => ({
      id: profile.userId,
      label: profile.displayName ?? profile.fullName ?? profile.email,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      {/* One-off, bigger-than-`PageTitle` header — a "large page header"
       *  was an explicit design goal for this page specifically; bumping
       *  the shared `PageTitle` component itself would resize every other
       *  admin page's header too, so this stays local to this route. */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{tNav("label")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{tNav("description")}</p>
      </div>
      {searchResult.success ? (
        <AuditViewerManager
          result={searchResult.data}
          filters={filters}
          cursorStack={cursorStack}
          limit={PAGE_SIZE}
          actorOptions={actorOptions}
        />
      ) : (
        <ErrorState title={searchResult.message} />
      )}
    </div>
  );
}
