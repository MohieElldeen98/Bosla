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
import { OrderRowActions } from "@/components/admin/orders/OrderRowActions";
import { ORDER_STATUSES } from "@/commerce/types/order";
import type { OrderListItem, OrderSearchFilters, OrderSearchResult, OrderSortField } from "@/commerce/types/order-search";

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

/** `/admin/orders`'s interactive shell (Phase 5, Step 5.1) — same
 *  URL-search-param-driven pattern as `EnrollmentsManager`. No "Create"
 *  action — orders come from checkout, not an admin form, same
 *  reasoning `UsersManager` has none either. */
export function OrdersManager({
  result,
  filters,
}: {
  result: OrderSearchResult<OrderListItem>;
  filters: OrderSearchFilters;
}) {
  const t = useTranslations("Admin.orders");
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
    router.push(query ? `/admin/orders?${query}` : "/admin/orders", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const sortBy: OrderSortField = filters.sortBy ?? "createdAt";
  const sortDirection = filters.sortDirection ?? "desc";

  function handleSort(field: OrderSortField) {
    const nextDirection = sortBy === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sortBy: field, sortDir: nextDirection }, false);
  }

  function sortIndicator(field: OrderSortField) {
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
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
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
                    onClick={() => handleSort("total")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.total")}
                    {sortIndicator("total")}
                  </button>
                </TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.payment")}</TableHead>
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
              {result.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{order.studentName}</p>
                      {order.studentEmail && (
                        <p className="truncate text-xs text-muted-foreground">{order.studentEmail}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatMoney(order.total, order.currency, locale)}
                    {order.couponCode && (
                      <span className="ms-1 text-xs text-muted-foreground">({order.couponCode})</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status}>{t(`status.${order.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.latestPaymentStatus ? t(`paymentStatus.${order.latestPaymentStatus}`) : t("paymentStatus.none")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(order.createdAt, locale)}</TableCell>
                  <TableCell>
                    <OrderRowActions order={order} />
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
