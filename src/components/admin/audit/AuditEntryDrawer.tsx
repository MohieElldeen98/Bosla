"use client";

import { useLocale, useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AuditDomainBadge } from "@/components/admin/audit/AuditDomainBadge";
import { formatMetadataValue, humanizeAction } from "@/components/admin/audit/audit-format";
import type { AuditFeedEntry } from "@/audit/types/audit-feed";

/**
 * Replaces the old inline "join every metadata key into one truncated
 * string" Details column — a full key/value list, one row's worth at a
 * time, opened from a per-row trigger. Read-only (unlike `MediaDetailSheet`,
 * whose controlled-`open` pattern this otherwise copies): an audit entry is
 * an immutable historical record, nothing here is editable.
 */
export function AuditEntryDrawer({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AuditFeedEntry | null;
}) {
  const t = useTranslations("Admin.audit");
  const tDomains = useTranslations("Admin.users.activity");
  const locale = useLocale();

  if (!entry) return null;

  const metadataEntries = Object.entries(entry.metadata);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{humanizeAction(entry.action)}</SheetTitle>
          <SheetDescription>
            {new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "medium" }).format(new Date(entry.createdAt))}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t("columns.actor")}</dt>
              <dd className="font-medium text-foreground">{entry.actorName ?? entry.actorEmail ?? t("system")}</dd>
              {entry.actorName && entry.actorEmail && (
                <dd className="text-xs text-muted-foreground">{entry.actorEmail}</dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("columns.domain")}</dt>
              <dd className="mt-1">
                <AuditDomainBadge domain={entry.domain}>{tDomains(`domains.${entry.domain}`)}</AuditDomainBadge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("columns.action")}</dt>
              <dd className="mt-1 font-mono text-xs text-foreground">{entry.action}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t("columns.entity")}</dt>
              <dd className="mt-1 font-mono text-xs break-all text-foreground">{entry.entityId ?? "—"}</dd>
            </div>
          </dl>

          <div className="space-y-1.5 rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-foreground">{t("drawer.metadataTitle")}</p>
            {metadataEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("drawer.noMetadata")}</p>
            ) : (
              <dl className="space-y-2">
                {metadataEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-3 text-xs">
                    <dt className="shrink-0 text-muted-foreground">{key}</dt>
                    <dd className="text-end font-medium break-all text-foreground">{formatMetadataValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
