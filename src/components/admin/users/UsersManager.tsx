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
import { UserAvatar } from "@/components/auth/UserAvatar";
import { UserRowActions } from "@/components/admin/users/UserRowActions";
import { ROLES } from "@/auth/types/role";
import { PROFILE_STATUSES } from "@/auth/types/profile-status";
import type { Profile } from "@/auth/types/profile";
import type { ProfileAdminSearchFilters, ProfileSearchResult, ProfileSortField } from "@/auth/types/profile-search";

const ALL = "all";

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/**
 * `/admin/users`'s interactive shell (Phase 7) — same URL-search-param-
 * driven pattern as `EnrollmentsManager`/`CoursesManager`: every search/
 * filter/sort/page change is a real server round-trip via `router.push`,
 * not client-side slicing. No "Create" action — unlike Courses/
 * Enrollments, users aren't admin-created, they sign themselves up.
 */
export function UsersManager({
  result,
  filters,
}: {
  result: ProfileSearchResult<Profile>;
  filters: ProfileAdminSearchFilters;
}) {
  const t = useTranslations("Admin.users");
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
    router.push(query ? `/admin/users?${query}` : "/admin/users", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const sortBy: ProfileSortField = filters.sortBy ?? "createdAt";
  const sortDirection = filters.sortDirection ?? "desc";

  function handleSort(field: ProfileSortField) {
    const nextDirection = sortBy === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sortBy: field, sortDir: nextDirection }, false);
  }

  function sortIndicator(field: ProfileSortField) {
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
          value={filters.role ?? ALL}
          onValueChange={(value) => updateParams({ role: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allRoles")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allRoles")}</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`role.${role}`)}
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
            {PROFILE_STATUSES.filter((status) => status !== "deleted").map((status) => (
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
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("displayName")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.user")}
                    {sortIndicator("displayName")}
                  </button>
                </TableHead>
                <TableHead>{t("columns.role")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.created")}
                    {sortIndicator("createdAt")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("lastLoginAt")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.lastSignIn")}
                    {sortIndicator("lastLoginAt")}
                  </button>
                </TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.displayName ?? user.fullName ?? user.email} avatarUrl={user.avatarUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {user.displayName ?? user.fullName ?? user.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t(`role.${user.role}`)}</TableCell>
                  <TableCell>
                    <StatusBadge status={user.status}>{t(`status.${user.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt, locale)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.lastLoginAt, locale)}</TableCell>
                  <TableCell>
                    <UserRowActions user={user} />
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
