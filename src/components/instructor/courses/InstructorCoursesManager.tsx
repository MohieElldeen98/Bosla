"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ImageIcon, Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { InstructorCourseRowActions } from "@/components/instructor/courses/InstructorCourseRowActions";
import { COURSE_STATUSES } from "@/courses/types/course-status";
import type { CourseListItem, CourseSearchFilters, CourseSearchResult } from "@/courses/types/course-search";

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
 * "My Courses" (`/instructor/courses`, Phase 6, Step 6.3) — same URL-
 * search-param-driven pattern as `CoursesManager` (the Admin one), but
 * deliberately smaller: no bulk-select, no specialty/category/instructor
 * filters (there's only one instructor in this list — the signed-in
 * one), and no sortable-column buttons (a small personal list doesn't
 * need them the way the full catalog does). The actual scoping to "only
 * my courses" happens server-side, in
 * `CourseService.searchResolvedForInstructor` — this component just
 * renders whatever page it's handed, the same way `CoursesManager`
 * trusts `searchResolved`.
 */
export function InstructorCoursesManager({
  result,
  filters,
}: {
  result: CourseSearchResult<CourseListItem>;
  filters: CourseSearchFilters;
}) {
  const t = useTranslations("Instructor.myCourses");
  const tc = useTranslations("Admin.courses");
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
    router.push(query ? `/instructor/courses?${query}` : "/instructor/courses", { scroll: false });
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
            placeholder={tc("searchPlaceholder")}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        }
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/instructor/courses/new" />}>
            <Plus aria-hidden="true" />
            {tc("createCourse")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) => updateParams({ status: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={tc("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tc("filters.allStatuses")}</SelectItem>
            {COURSE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {tc(`status.${status === "in_review" ? "inReview" : status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {result.items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button size="sm" nativeButton={false} render={<Link href="/instructor/courses/new" />}>
                  {tc("createCourse")}
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("columns.course")}</TableHead>
                <TableHead>{tc("columns.specialty")}</TableHead>
                <TableHead>{tc("columns.price")}</TableHead>
                <TableHead>{tc("columns.status")}</TableHead>
                <TableHead>{tc("columns.updatedAt")}</TableHead>
                <TableHead>
                  <span className="sr-only">{tc("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {course.coverImageUrl ? (
                        <Image
                          src={course.coverImageUrl}
                          alt=""
                          width={40}
                          height={40}
                          sizes="40px"
                          className="size-10 shrink-0 rounded-lg object-cover ring-1 ring-foreground/10"
                        />
                      ) : (
                        <span
                          role="img"
                          aria-label={tc("noCoverImage")}
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
                  <TableCell>{formatPrice(course.price, course.currency, locale)}</TableCell>
                  <TableCell>
                    <StatusBadge status={course.status}>
                      {tc(`status.${course.status === "in_review" ? "inReview" : course.status}`)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(course.updatedAt, locale)}</TableCell>
                  <TableCell>
                    <InstructorCourseRowActions course={course} />
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
        summary={({ from, to, total }) => tc("pagination.summary", { from, to, total })}
        previousLabel={tc("pagination.previous")}
        nextLabel={tc("pagination.next")}
      />
    </div>
  );
}
