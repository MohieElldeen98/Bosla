"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { EnrollmentRowActions } from "@/components/admin/enrollments/EnrollmentRowActions";
import { ENROLLMENT_STATUSES } from "@/learning/types/enrollment-status";
import type {
  EnrollmentListItem,
  EnrollmentSearchFilters,
  EnrollmentSearchResult,
  EnrollmentSortField,
} from "@/learning/types/enrollment-search";

const ALL = "all";

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

interface FilterOption {
  id: string;
  label: string;
}

/**
 * `/admin/enrollments`'s interactive shell (Step 4.2) — same
 * URL-search-param-driven pattern as `CoursesManager` (Step 3.2): every
 * search/filter/sort/page change is a real server round-trip via
 * `router.push`, not client-side slicing. No bulk-selection
 * infrastructure — not requested for this step, unlike the Course
 * listing's.
 */
export function EnrollmentsManager({
  result,
  filters,
  students,
  courses,
}: {
  result: EnrollmentSearchResult<EnrollmentListItem>;
  filters: EnrollmentSearchFilters;
  students: FilterOption[];
  courses: FilterOption[];
}) {
  const t = useTranslations("Admin.enrollments");
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
    router.push(query ? `/admin/enrollments?${query}` : "/admin/enrollments", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const sortBy: EnrollmentSortField = filters.sortBy ?? "createdAt";
  const sortDirection = filters.sortDirection ?? "desc";

  function handleSort(field: EnrollmentSortField) {
    const nextDirection = sortBy === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sortBy: field, sortDir: nextDirection }, false);
  }

  function sortIndicator(field: EnrollmentSortField) {
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
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/admin/enrollments/new" />}>
            <Plus aria-hidden="true" />
            {t("createEnrollment")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.studentId ?? ALL}
          onValueChange={(value) => updateParams({ studentId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allStudents")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStudents")}</SelectItem>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.courseId ?? ALL}
          onValueChange={(value) => updateParams({ courseId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allCourses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allCourses")}</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.label}
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
            {ENROLLMENT_STATUSES.map((status) => (
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
                <TableHead>{t("columns.grantedBy")}</TableHead>
                <TableHead>{t("columns.source")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.grantedAt")}
                    {sortIndicator("createdAt")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("updatedAt")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.updatedAt")}
                    {sortIndicator("updatedAt")}
                  </button>
                </TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{enrollment.studentName}</p>
                      {enrollment.studentEmail && (
                        <p className="truncate text-xs text-muted-foreground">{enrollment.studentEmail}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{enrollment.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{enrollment.grantedByName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{t(`source.${enrollment.source}`)}</TableCell>
                  <TableCell>
                    <StatusBadge status={enrollment.status}>{t(`status.${enrollment.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(enrollment.createdAt, locale)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(enrollment.updatedAt, locale)}</TableCell>
                  <TableCell>
                    <EnrollmentRowActions enrollment={enrollment} />
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
