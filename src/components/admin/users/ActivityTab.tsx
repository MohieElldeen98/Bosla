import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/EmptyState";
import type { ActivityFeedEntry } from "@/auth/types/user-admin";

const DOMAIN_VARIANT: Record<ActivityFeedEntry["domain"], "default" | "secondary" | "outline"> = {
  course: "default",
  learning: "secondary",
  cms: "outline",
};

/**
 * The User Details page's (Phase 7) Activity tab — a merged, sorted read
 * over the three *existing* audit tables (`course_audit_logs`,
 * `learning_audit_logs`, `cms_audit_logs`), filtered to this user as
 * actor (`UserAdminService.getActivityFeed`). No new audit table: role
 * changes and account-status changes aren't logged here either, matching
 * `UserRoleService`'s own established precedent of not audit-logging
 * identity changes — this tab surfaces *existing* infrastructure, it
 * doesn't invent more of it.
 *
 * `Admin.users.activity.actions.cms.publish`/`.revert` have no matching
 * `CmsAuditAction` union member — no code path can write a new row with
 * that action — but real historical `cms_audit_logs` rows from the
 * removed draft/publish/preview workflow (`cms-overview.md` §15) still
 * have `action: "publish"`/`"revert"`, and this label lookup reads that
 * raw DB text directly. Keep both translation keys so those old entries
 * still render instead of falling back to a raw `actions.cms.publish`
 * key string.
 */
export async function ActivityTab({ entries, locale }: { entries: ActivityFeedEntry[]; locale: string }) {
  const t = await getTranslations("Admin.users.activity");

  if (entries.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <ol className="space-y-2 rounded-2xl border border-border bg-card p-4 sm:p-6">
      {entries.map((entry) => (
        <li key={`${entry.domain}-${entry.id}`} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={DOMAIN_VARIANT[entry.domain]}>{t(`domains.${entry.domain}`)}</Badge>
              <p className="text-sm font-medium text-foreground">{t(`actions.${entry.domain}.${entry.action}`)}</p>
            </div>
            {entry.courseTitle && <p className="mt-1 truncate text-xs text-muted-foreground">{entry.courseTitle}</p>}
          </div>
          <time className="shrink-0 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(entry.createdAt),
            )}
          </time>
        </li>
      ))}
    </ol>
  );
}
