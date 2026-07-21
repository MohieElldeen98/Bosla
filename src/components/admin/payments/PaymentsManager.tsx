"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { PAYMENT_STATUSES, KNOWN_PAYMENT_PROVIDERS } from "@/payments/types/payment";
import type {
  PaymentListItem,
  PaymentSearchFilters,
  PaymentSearchResult,
  PaymentSortField,
} from "@/payments/types/payment-search";

const ALL = "all";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** `/admin/payments`'s interactive shell — same URL-search-param-driven
 *  pattern as `OrdersManager`. No "Create" action: payments come from
 *  checkout, never an admin form. */
export function PaymentsManager({
  result,
  filters,
}: {
  result: PaymentSearchResult<PaymentListItem>;
  filters: PaymentSearchFilters;
}) {
  const t = useTranslations("Admin.payments");
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
    router.push(query ? `/admin/payments?${query}` : "/admin/payments", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const sortBy: PaymentSortField = filters.sortBy ?? "createdAt";
  const sortDirection = filters.sortDirection ?? "desc";

  function handleSort(field: PaymentSortField) {
    const nextDirection = sortBy === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sortBy: field, sortDir: nextDirection }, false);
  }

  function sortIndicator(field: PaymentSortField) {
    if (sortBy !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  }

  return (
    <div className="space-y-4">
      <ActionToolbar
        search={
          <SearchInput
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => updateParams({ status: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.provider ?? ALL}
          onValueChange={(value) => updateParams({ provider: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allProviders")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allProviders")}</SelectItem>
            {KNOWN_PAYMENT_PROVIDERS.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {result.items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.student")}</TableHead>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("amount")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.amount")}
                    {sortIndicator("amount")}
                  </button>
                </TableHead>
                <TableHead>{t("columns.provider")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.createdAt")}
                    {sortIndicator("createdAt")}
                  </button>
                </TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{payment.studentName}</p>
                      {payment.studentEmail && (
                        <p className="truncate text-xs text-muted-foreground">{payment.studentEmail}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatMoney(payment.amount, payment.currency, locale)}
                    {Number(payment.refundedAmount) > 0 && (
                      <span className="ms-1 text-xs text-muted-foreground">
                        (−{formatMoney(payment.refundedAmount, payment.currency, locale)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.provider}</TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status}>{t(`status.${payment.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(payment.createdAt, locale)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/payments/${payment.id}`}
                      className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {t("actions.view")}
                    </Link>
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
