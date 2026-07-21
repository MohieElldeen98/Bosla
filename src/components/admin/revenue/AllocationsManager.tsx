"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { REVENUE_ALLOCATION_KINDS, REVENUE_ALLOCATION_STATUSES } from "@/commerce/types/revenue";
import type { RevenueAllocationListItem } from "@/commerce/types/revenue";
import type { AllocationSearchFilters } from "@/commerce/repositories/revenue-allocation.repository";

const ALL = "all";

interface AllocationsResult {
  items: RevenueAllocationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/** The allocations ledger's interactive shell — filters (kind, status,
 *  recipient) + pagination, URL-driven like `OrdersManager`. Read-only
 *  by design: ledger rows are immutable. */
export function AllocationsManager({
  result,
  filters,
}: {
  result: AllocationsResult;
  filters: AllocationSearchFilters;
}) {
  const t = useTranslations("Admin.revenue.allocations");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    router.push(query ? `/admin/revenue/allocations?${query}` : "/admin/revenue/allocations", { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.kind ?? ALL}
          onValueChange={(value) => updateParams({ kind: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allKinds")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allKinds")}</SelectItem>
            {REVENUE_ALLOCATION_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(`kind.${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => updateParams({ status: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            {REVENUE_ALLOCATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.recipientType ?? ALL}
          onValueChange={(value) => updateParams({ recipient: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allRecipients")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allRecipients")}</SelectItem>
            <SelectItem value="platform">{t("recipient.platform")}</SelectItem>
            <SelectItem value="instructor">{t("recipient.instructor")}</SelectItem>
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
                <TableHead>{t("columns.recipient")}</TableHead>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>{t("columns.kind")}</TableHead>
                <TableHead>{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell className="font-medium text-foreground">{allocation.instructorName}</TableCell>
                  <TableCell className="text-muted-foreground">{allocation.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{t(`kind.${allocation.kind}`)}</TableCell>
                  <TableCell
                    className={`tabular-nums ${Number(allocation.amount) < 0 ? "text-destructive" : "text-foreground"}`}
                  >
                    {formatMoney(allocation.amount, allocation.currency, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={allocation.status}>{t(`status.${allocation.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(allocation.createdAt),
                    )}
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
