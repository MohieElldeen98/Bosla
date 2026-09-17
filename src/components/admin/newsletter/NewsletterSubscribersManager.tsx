"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Download, Loader2, MailCheck, MailX } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { NewsletterSubscriberRowActions } from "@/components/admin/newsletter/NewsletterSubscriberRowActions";
import { exportNewsletterSubscribersAction } from "@/newsletter/actions/newsletter-subscription.actions";
import { NEWSLETTER_SUBSCRIBER_STATUSES } from "@/newsletter/types/newsletter-subscriber";
import type {
  NewsletterSubscriberSearchFilters,
  NewsletterSubscriberSearchResult,
} from "@/newsletter/types/newsletter-subscriber";

const ALL = "all";

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** RFC 4180 quoting. An email can't contain a comma or a quote, but
 *  `locale` and the date are interpolated too and the file is opened in
 *  Excel — quoting everything is one line and removes the question. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** `/admin/newsletter`'s interactive shell — same URL-search-param-driven
 *  pattern as `ContactInboxManager`: server-side pagination/search/filter,
 *  so every view is a shareable URL. */
export function NewsletterSubscribersManager({
  result,
  filters,
  counts,
}: {
  result: NewsletterSubscriberSearchResult;
  filters: NewsletterSubscriberSearchFilters;
  counts: Record<string, number>;
}) {
  const t = useTranslations("Admin.newsletter");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(filters.query ?? "");
  const [isExporting, startExport] = useTransition();

  useEffect(() => {
    setSearchValue(filters.query ?? "");
  }, [filters.query]);

  function updateParams(updates: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    router.push(query ? `/admin/newsletter?${query}` : "/admin/newsletter", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  /** Builds the file in the browser from rows the action returns, rather
   *  than streaming a CSV from a route handler — this list is a few
   *  thousand short rows at most, and keeping it a Server Action means it
   *  reuses the same admin guard as everything else here instead of
   *  needing its own auth on a public URL. */
  function handleExport() {
    startExport(async () => {
      const result = await exportNewsletterSubscribersAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (result.data.length === 0) {
        toast.error(t("exportEmpty"));
        return;
      }
      const header = [t("columns.email"), t("columns.locale"), t("columns.subscribedAt")];
      const csv = [
        header.map(csvCell).join(","),
        ...result.data.map((row) => [row.email, row.locale, row.createdAt].map(csvCell).join(",")),
      ].join("\r\n");
      // The BOM is what makes Excel read the file as UTF-8; without it the
      // Arabic locale column arrives as mojibake.
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("toasts.exported", { count: result.data.length }));
    });
  }

  const subscribed = counts.subscribed ?? 0;
  const unsubscribed = counts.unsubscribed ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={t("stats.subscribed")} value={String(subscribed)} icon={MailCheck} />
        <StatCard label={t("stats.unsubscribed")} value={String(unsubscribed)} icon={MailX} />
      </div>

      <ActionToolbar
        search={
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        }
        actions={
          <>
            <Select
              value={filters.status ?? ALL}
              onValueChange={(value) => updateParams({ status: value === ALL ? undefined : (value ?? undefined) })}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder={t("filters.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
                {NEWSLETTER_SUBSCRIBER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
              {t("export")}
            </Button>
          </>
        }
      />

      <div className="rounded-2xl border border-border bg-card">
        {result.items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{t("columns.locale")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.subscribedAt")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium text-foreground" dir="ltr">
                    {subscriber.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground uppercase">{subscriber.locale}</TableCell>
                  <TableCell>
                    <StatusBadge status={subscriber.status}>{t(`status.${subscriber.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(subscriber.createdAt, locale)}</TableCell>
                  <TableCell>
                    <NewsletterSubscriberRowActions subscriber={subscriber} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        onPageChange={(page) => updateParams({ page: String(page) }, false)}
        summary={({ from, to, total }) => t("pagination.summary", { from, to, total })}
        previousLabel={t("pagination.previous")}
        nextLabel={t("pagination.next")}
      />
    </div>
  );
}
