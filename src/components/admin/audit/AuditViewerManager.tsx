"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bot, Copy, Download, Eye, LayoutGrid, User as UserIcon, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pagination } from "@/components/admin/Pagination";
import { AuditDomainBadge } from "@/components/admin/audit/AuditDomainBadge";
import { AuditEntryDrawer } from "@/components/admin/audit/AuditEntryDrawer";
import {
  AUDIT_DATE_PRESETS,
  auditEntriesToCsv,
  avatarColorFor,
  downloadCsv,
  formatRelativeTime,
  getInitials,
  humanizeAction,
  readableEntityLabel,
  resolveEntityHref,
  toDateOnly,
} from "@/components/admin/audit/audit-format";
import { serializeCursorStack } from "@/audit/validators/audit-feed.validator";
import { AUDIT_DOMAINS } from "@/audit/types/audit-feed";
import type { AuditFeedSearchParams } from "@/audit/validators/audit-feed.validator";
import type { AuditFeedCursor, AuditFeedEntry, AuditFeedResult } from "@/audit/types/audit-feed";

const ALL = "all";

function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));
}

/**
 * `/admin/audit`'s interactive shell — dashboard-style presentation over
 * the same URL-search-param-driven filtering/pagination
 * `CoursesManager`/`UsersManager` establish: every search/filter/page
 * change is a real server round-trip via `router.push`, no client-side
 * slicing, no changes to `AuditFeedService`, its filters, its cursor
 * pagination, or its security. Everything below this line is presentation
 * only — see `updateCursorStack`'s doc comment for the one genuine
 * mechanical difference (`AuditFeedService` is cursor-, not offset-,
 * based), unchanged from the original build.
 */
export function AuditViewerManager({
  result,
  filters,
  cursorStack,
  limit,
  actorOptions,
}: {
  result: AuditFeedResult;
  filters: AuditFeedSearchParams;
  cursorStack: AuditFeedCursor[];
  limit: number;
  actorOptions: { id: string; label: string }[];
}) {
  const t = useTranslations("Admin.audit");
  const tDomains = useTranslations("Admin.users.activity");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(filters.query ?? "");
  const [actionValue, setActionValue] = useState(filters.action ?? "");
  const [selectedEntry, setSelectedEntry] = useState<AuditFeedEntry | null>(null);

  useEffect(() => {
    setSearchValue(filters.query ?? "");
  }, [filters.query]);
  useEffect(() => {
    setActionValue(filters.action ?? "");
  }, [filters.action]);

  function updateParams(updates: Record<string, string | undefined>, resetCursor = true) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetCursor) next.delete("cursors");
    const query = next.toString();
    router.push(query ? `/admin/audit?${query}` : "/admin/audit", { scroll: false });
  }

  // Debounced search — waits for the admin to stop typing, same 350ms
  // pattern `CoursesManager`/`UsersManager` already use.
  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  useEffect(() => {
    if (actionValue === (filters.action ?? "")) return;
    const timeout = setTimeout(() => updateParams({ action: actionValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionValue]);

  const hasActiveFilters = Boolean(
    filters.query || filters.domain || filters.actorId || filters.action || filters.dateFrom || filters.dateTo,
  );

  function clearFilters() {
    router.push("/admin/audit", { scroll: false });
  }

  const page = cursorStack.length + 1;

  /**
   * `<Pagination>` is presentation-only and only ever calls
   * `onPageChange(page - 1)`/`onPageChange(page + 1)` from its own
   * Previous/Next buttons (never an arbitrary jump — there's no page-
   * number input) — so it can be reused unmodified for keyset pagination:
   * "Next" pushes the cursor `AuditFeedService` just returned; "Previous"
   * pops the stack back to the prior cursor. No reverse query, no new
   * pagination component.
   */
  function handlePageChange(newPage: number) {
    if (newPage > page) {
      if (!result.nextCursor) return;
      updateParams({ cursors: serializeCursorStack([...cursorStack, result.nextCursor]) }, false);
    } else if (newPage < page) {
      updateParams({ cursors: serializeCursorStack(cursorStack.slice(0, -1)) }, false);
    }
  }

  // No true "total" exists for a keyset-paginated feed until the last
  // page is reached — `total`/`totalPages` are lower-bound sentinels
  // sized just enough for `<Pagination>`'s own from/to math and its
  // Next-button `disabled` check to come out correct; `resultSummaryText`
  // below never displays a fabricated exact count.
  const totalPages = result.hasMore ? page + 1 : page;
  const total = result.hasMore ? page * limit + 1 : (page - 1) * limit + result.entries.length;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  // Computed once and reused for both the top-of-table counter and
  // `<Pagination>`'s own summary line below, so the two can never drift —
  // no pagination math is duplicated, just the same string rendered twice.
  const resultSummaryText = result.hasMore
    ? t("pagination.summaryAtLeast", { from, to })
    : t("pagination.summary", { from, to, total });

  function handleExportCsv() {
    if (result.entries.length === 0) return;
    downloadCsv(`audit-log-${toDateOnly(new Date())}.csv`, auditEntriesToCsv(result.entries));
  }

  // Same inline `navigator.clipboard` + `sonner` toast pattern
  // `MediaDetailSheet`'s `copyUrl`/`ShareButtons` already use — no new
  // clipboard abstraction.
  function handleCopyEntityId(entityId: string) {
    navigator.clipboard.writeText(entityId).then(
      () => toast.success(t("entity.copied")),
      () => toast.error(t("entity.copyFailed")),
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("filtersCard.title")}</CardTitle>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X aria-hidden="true" />
                {t("filtersCard.clear")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("filters.domainLabel")}</Label>
              <Select
                value={filters.domain ?? ALL}
                onValueChange={(value) => updateParams({ domain: value && value !== ALL ? value : undefined })}
                // Base-UI's closed trigger renders the raw `value` string
                // unless the root gets an `items` map (see `SelectField`'s
                // own doc comment for this exact caveat) — without it, e.g.
                // the actor filter would show a raw uuid instead of a name.
                items={Object.fromEntries([
                  [ALL, t("filters.allDomains")],
                  ...AUDIT_DOMAINS.map((domain) => [domain, tDomains(`domains.${domain}`)]),
                ])}
              >
                <SelectTrigger className="w-full">
                  <LayoutGrid aria-hidden="true" className="size-4 text-muted-foreground" />
                  <SelectValue placeholder={t("filters.allDomains")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filters.allDomains")}</SelectItem>
                  {AUDIT_DOMAINS.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {tDomains(`domains.${domain}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("filters.actorLabel")}</Label>
              <Select
                value={filters.actorId ?? ALL}
                onValueChange={(value) => updateParams({ actorId: value && value !== ALL ? value : undefined })}
                items={Object.fromEntries([
                  [ALL, t("filters.allActors")],
                  ...actorOptions.map((actor) => [actor.id, actor.label]),
                ])}
              >
                <SelectTrigger className="w-full">
                  <UserIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <SelectValue placeholder={t("filters.allActors")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filters.allActors")}</SelectItem>
                  {actorOptions.map((actor) => (
                    <SelectItem key={actor.id} value={actor.id}>
                      {actor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
                {t("filters.actionLabel")}
              </Label>
              <Input
                id="audit-action"
                className="w-full"
                placeholder={t("filters.actionPlaceholder")}
                value={actionValue}
                onChange={(event) => setActionValue(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("filters.searchLabel")}</Label>
              <SearchInput
                placeholder={t("searchPlaceholder")}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="audit-date-from" className="text-xs text-muted-foreground">
                {t("filters.dateFromLabel")}
              </Label>
              <Input
                id="audit-date-from"
                type="date"
                className="w-full"
                value={filters.dateFrom ?? ""}
                onChange={(event) => updateParams({ dateFrom: event.target.value || undefined })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audit-date-to" className="text-xs text-muted-foreground">
                {t("filters.dateToLabel")}
              </Label>
              <Input
                id="audit-date-to"
                type="date"
                className="w-full"
                value={filters.dateTo ?? ""}
                onChange={(event) => updateParams({ dateTo: event.target.value || undefined })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-xs font-medium text-muted-foreground">{t("quickFilters.label")}</span>
            {AUDIT_DATE_PRESETS.map((preset) => {
              const { from: presetFrom, to: presetTo } = preset.range();
              const isActive = filters.dateFrom === presetFrom && filters.dateTo === presetTo;
              return (
                <Button
                  key={preset.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="xs"
                  onClick={() => updateParams({ dateFrom: presetFrom, dateTo: presetTo })}
                >
                  {t(`quickFilters.${preset.labelKey}`)}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {result.entries.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
              <p className="text-sm font-medium text-foreground">{resultSummaryText}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                title={t("pageActions.exportCsvHint")}
              >
                <Download aria-hidden="true" />
                {t("pageActions.exportCsv")}
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.time")}</TableHead>
                  <TableHead>{t("columns.actor")}</TableHead>
                  <TableHead>{t("columns.domain")}</TableHead>
                  <TableHead>{t("columns.action")}</TableHead>
                  <TableHead>{t("columns.entity")}</TableHead>
                  <TableHead className="text-end">{t("columns.details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.entries.map((entry: AuditFeedEntry) => {
                  const actorLabel = entry.actorName ?? entry.actorEmail ?? t("system");
                  const readableLabel = readableEntityLabel(entry.metadata);
                  const entityHref = resolveEntityHref(entry.domain, entry.entityId);
                  const entityTypeLabel = t(`entityLabels.${entry.domain}`);

                  const actorInner = (
                    <>
                      {entry.actorId ? (
                        <Avatar>
                          {entry.actorAvatarUrl && <AvatarImage src={entry.actorAvatarUrl} alt="" />}
                          <AvatarFallback className={avatarColorFor(entry.actorId)}>
                            {getInitials(actorLabel)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Bot aria-hidden="true" className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground group-hover:underline">{actorLabel}</p>
                        {entry.actorName && entry.actorEmail && (
                          <p className="truncate text-xs text-muted-foreground">{entry.actorEmail}</p>
                        )}
                      </div>
                    </>
                  );

                  const entityInner = (
                    <>
                      <p className="truncate text-xs font-medium text-foreground group-hover:underline">
                        {entityTypeLabel}
                      </p>
                      {readableLabel ? (
                        <p className="truncate text-xs text-muted-foreground">{readableLabel}</p>
                      ) : (
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {entry.entityId ? `${entry.entityId.slice(0, 8)}…` : "—"}
                        </p>
                      )}
                    </>
                  );

                  return (
                    <TableRow key={`${entry.domain}-${entry.id}`}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{formatDateTime(entry.createdAt, locale)}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(entry.createdAt, locale)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.actorId ? (
                          <Link href={`/admin/users/${entry.actorId}`} className="group flex min-w-0 items-center gap-2.5">
                            {actorInner}
                          </Link>
                        ) : (
                          <div className="flex min-w-0 items-center gap-2.5">{actorInner}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <AuditDomainBadge domain={entry.domain}>{tDomains(`domains.${entry.domain}`)}</AuditDomainBadge>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{humanizeAction(entry.action)}</p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">{entry.action}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start justify-between gap-1">
                          {entityHref ? (
                            <Link
                              href={entityHref}
                              className="group min-w-0 max-w-32"
                              title={entry.entityId ?? undefined}
                            >
                              {entityInner}
                            </Link>
                          ) : (
                            <div className="min-w-0 max-w-32" title={entry.entityId ?? undefined}>
                              {entityInner}
                            </div>
                          )}
                          {entry.entityId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="shrink-0"
                              aria-label={t("entity.copyId")}
                              title={t("entity.copyId")}
                              onClick={() => handleCopyEntityId(entry.entityId as string)}
                            >
                              <Copy aria-hidden="true" className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("drawer.viewDetails")}
                          title={t("drawer.viewDetails")}
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={limit}
        onPageChange={handlePageChange}
        summary={() => resultSummaryText}
        previousLabel={t("pagination.previous")}
        nextLabel={t("pagination.next")}
      />

      <AuditEntryDrawer
        open={selectedEntry !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
        entry={selectedEntry}
      />
    </div>
  );
}
