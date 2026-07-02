"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ImageIcon, Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { CourseRowActions } from "@/components/admin/courses/CourseRowActions";
import { COURSE_STATUSES } from "@/courses/types/course-status";
import type { CourseListItem, CourseSearchFilters, CourseSearchResult, CourseSortField } from "@/courses/types/course-search";
import type { ResolvedCategory } from "@/courses/types/category";
import type { ResolvedInstructor } from "@/courses/types/instructor";
import type { ResolvedSpecialty } from "@/courses/types/specialty";
import type { Role } from "@/auth/types/role";

const ALL = "all";

function formatPrice(price: string, currency: string, locale: string): string {
  const amount = Number(price);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

/**
 * `/admin/courses`'s interactive shell — search, filters, sortable
 * columns, and pagination are all URL search-param-driven (a real
 * server-side re-fetch via `router.push` on every change, not
 * client-side slicing), reusing the same `CoursesManager` this whole page
 * revolves around. Bulk-selection state (checkboxes, "N selected") is
 * local-only infrastructure — no bulk action exists yet (Step 3.2 scope).
 */
export function CoursesManager({
  result,
  filters,
  specialties,
  categories,
  instructors,
  userRole,
}: {
  result: CourseSearchResult<CourseListItem>;
  filters: CourseSearchFilters;
  specialties: ResolvedSpecialty[];
  categories: ResolvedCategory[];
  instructors: ResolvedInstructor[];
  userRole: Role;
}) {
  const t = useTranslations("Admin.courses");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(filters.query ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset the search box + selection whenever the server-provided filters
  // change out from under us (e.g. browser back/forward).
  useEffect(() => {
    setSearchValue(filters.query ?? "");
  }, [filters.query]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [result]);

  function updateParams(updates: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    router.push(query ? `/admin/courses?${query}` : "/admin/courses", { scroll: false });
  }

  // Debounced search — waits for the admin to stop typing before triggering
  // the server round-trip.
  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const sortBy: CourseSortField = filters.sortBy ?? "updatedAt";
  const sortDirection = filters.sortDirection ?? "desc";

  function handleSort(field: CourseSortField) {
    const nextDirection = sortBy === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sortBy: field, sortDir: nextDirection }, false);
  }

  function sortIndicator(field: CourseSortField) {
    if (sortBy !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  }

  const allSelected = result.items.length > 0 && result.items.every((item) => selectedIds.has(item.id));
  const someSelected = result.items.some((item) => selectedIds.has(item.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(result.items.map((item) => item.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sortableColumns = useMemo(
    () => [
      { field: "price" as const, label: t("columns.price") },
      { field: "status" as const, label: t("columns.status") },
      { field: "updatedAt" as const, label: t("columns.updatedAt") },
    ],
    [t],
  );

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
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/courses/new" />}
          >
            <Plus aria-hidden="true" />
            {t("createCourse")}
          </Button>
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
            {COURSE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status === "in_review" ? "inReview" : status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.specialtyId ?? ALL}
          onValueChange={(value) => updateParams({ specialtyId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allSpecialties")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allSpecialties")}</SelectItem>
            {specialties.map((specialty) => (
              <SelectItem key={specialty.id} value={specialty.id}>
                {specialty.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId ?? ALL}
          onValueChange={(value) => updateParams({ categoryId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allCategories")}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.instructorId ?? ALL}
          onValueChange={(value) => updateParams({ instructorId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allInstructors")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allInstructors")}</SelectItem>
            {instructors.map((instructor) => (
              <SelectItem key={instructor.id} value={instructor.id}>
                {instructor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {someSelected && (
          <span className="ms-auto text-sm text-muted-foreground">
            {t("selectedCount", { count: selectedIds.size })}
          </span>
        )}
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
                <TableHead>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={toggleAll}
                    aria-label={t("selectAll")}
                  />
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("slug")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.course")}
                    {sortIndicator("slug")}
                  </button>
                </TableHead>
                <TableHead>{t("columns.specialty")}</TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.instructor")}</TableHead>
                {sortableColumns.map(({ field, label }) => (
                  <TableHead key={field}>
                    <button
                      type="button"
                      onClick={() => handleSort(field)}
                      className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                    >
                      {label}
                      {sortIndicator(field)}
                    </button>
                  </TableHead>
                ))}
                <TableHead>{t("columns.language")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(course.id)}
                      onCheckedChange={() => toggleOne(course.id)}
                      aria-label={t("selectRow", { title: course.title })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {course.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={course.coverImageUrl}
                          alt=""
                          className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
                        />
                      ) : (
                        <span
                          role="img"
                          aria-label={t("noCoverImage")}
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10"
                        >
                          <ImageIcon aria-hidden="true" className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{course.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{course.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{course.specialtyName}</TableCell>
                  <TableCell className="text-muted-foreground">{course.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{course.instructorName}</TableCell>
                  <TableCell>{formatPrice(course.price, course.currency, locale)}</TableCell>
                  <TableCell>
                    <StatusBadge status={course.status}>
                      {t(`status.${course.status === "in_review" ? "inReview" : course.status}`)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(course.updatedAt, locale)}</TableCell>
                  <TableCell className="text-muted-foreground">{t(`language.${course.language}`)}</TableCell>
                  <TableCell>
                    <CourseRowActions course={course} userRole={userRole} />
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
