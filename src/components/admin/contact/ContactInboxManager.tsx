"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { Link } from "@/i18n/navigation";
import { ContactMessageRowActions } from "@/components/admin/contact/ContactMessageRowActions";
import { CONTACT_MESSAGE_STATUSES } from "@/contact/types/contact-message";
import type {
  ContactMessage,
  ContactMessageSearchFilters,
  ContactMessageSearchResult,
} from "@/contact/types/contact-message";

const ALL = "all";

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** `/admin/contact`'s interactive shell — same URL-search-param-driven
 *  pattern as `OrdersManager`: server-side pagination/search/filter,
 *  all shareable/bookmarkable URLs. */
export function ContactInboxManager({
  result,
  filters,
}: {
  result: ContactMessageSearchResult<ContactMessage>;
  filters: ContactMessageSearchFilters;
}) {
  const t = useTranslations("Admin.contact");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(filters.query ?? "");

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
    router.push(query ? `/admin/contact?${query}` : "/admin/contact", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="space-y-4">
      <ActionToolbar
        search={
          <SearchInput
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        }
        actions={
          <Select value={filters.status ?? ALL} onValueChange={(value) => updateParams({ status: value === ALL ? undefined : (value ?? undefined) })}>
            <SelectTrigger size="sm">
              <SelectValue placeholder={t("filters.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
              {CONTACT_MESSAGE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                <TableHead>{t("columns.from")}</TableHead>
                <TableHead>{t("columns.subject")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((message) => (
                <TableRow key={message.id} data-unread={message.status === "new" ? "" : undefined} className="data-[unread]:bg-primary/[0.03]">
                  <TableCell>
                    <Link href={`/admin/contact/${message.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                      {message.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{message.email}</p>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-foreground">{message.subject}</TableCell>
                  <TableCell>
                    <StatusBadge status={message.status}>{t(`status.${message.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(message.createdAt, locale)}</TableCell>
                  <TableCell>
                    <ContactMessageRowActions message={message} />
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
