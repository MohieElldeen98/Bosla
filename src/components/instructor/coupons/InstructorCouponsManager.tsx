"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/admin/Pagination";
import { InstructorCouponRowActions } from "@/components/instructor/coupons/InstructorCouponRowActions";
import type { CouponListItem, CouponSearchFilters, CouponSearchResult } from "@/commerce/types/coupon-search";

const ALL = "all";

/** `/instructor/coupons`'s interactive shell (Phase 6, Step 6.6) — same
 *  URL-search-param-driven pattern as the Admin `CouponsManager`, with
 *  the scope filter dropped (an Instructor's coupons are always
 *  `scope: "course"`, nothing to filter by). */
export function InstructorCouponsManager({
  result,
  filters,
}: {
  result: CouponSearchResult<CouponListItem>;
  filters: CouponSearchFilters;
}) {
  const t = useTranslations("Instructor.coupons");
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
    router.push(query ? `/instructor/coupons?${query}` : "/instructor/coupons", { scroll: false });
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
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        }
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/instructor/coupons/new" />}>
            <Plus aria-hidden="true" />
            {t("createCoupon")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.isActive === undefined ? ALL : String(filters.isActive)}
          onValueChange={(value) => updateParams({ active: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            <SelectItem value="true">{t("status.active")}</SelectItem>
            <SelectItem value="false">{t("status.inactive")}</SelectItem>
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
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.discount")}</TableHead>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>{t("columns.usage")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium text-foreground">{coupon.code}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : coupon.discountValue}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{coupon.scopeLabel}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.redeemedCount}
                    {coupon.maxRedemptions !== null ? ` / ${coupon.maxRedemptions}` : ` ${t("unlimited")}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.isActive ? "default" : "secondary"}>
                      {coupon.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <InstructorCouponRowActions coupon={coupon} />
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
