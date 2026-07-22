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
import { InstructorApplicationRowActions } from "@/components/admin/instructors/InstructorApplicationRowActions";
import { INSTRUCTOR_APPLICATION_STATUSES } from "@/instructor/types/instructor-profile";
import type {
  InstructorProfileListItem,
  InstructorProfileSearchFilters,
  InstructorProfileSearchResult,
} from "@/instructor/types/instructor-profile-search";

const ALL = "all";

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** `/admin/instructors`'s interactive shell (Phase 6, Step 6.1) — same
 *  URL-search-param-driven pattern as `OrdersManager`. No "Create"
 *  action — applications come from a student applying, not an admin
 *  form, same reasoning `OrdersManager`/`UsersManager` have none either. */
export function InstructorApplicationsManager({
  result,
  filters,
}: {
  result: InstructorProfileSearchResult<InstructorProfileListItem>;
  filters: InstructorProfileSearchFilters;
}) {
  const t = useTranslations("Admin.instructorApplications");
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
    router.push(query ? `/admin/instructor-applications?${query}` : "/admin/instructor-applications", {
      scroll: false,
    });
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
            {INSTRUCTOR_APPLICATION_STATUSES.map((status) => (
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
                <TableHead>{t("columns.applicant")}</TableHead>
                <TableHead>{t("columns.headline")}</TableHead>
                <TableHead>{t("columns.credentials")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((application) => (
                <TableRow key={application.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{application.applicantName}</p>
                      {application.applicantEmail && (
                        <p className="truncate text-xs text-muted-foreground">{application.applicantEmail}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{application.headline}</TableCell>
                  <TableCell className="text-muted-foreground">{application.credentials ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={application.status}>{t(`status.${application.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(application.createdAt, locale)}</TableCell>
                  <TableCell>
                    <InstructorApplicationRowActions application={application} />
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
