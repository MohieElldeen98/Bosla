"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ImageIcon, Plus, Star, Tags, Layers3 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { ArticleRowActions } from "@/components/admin/blog/ArticleRowActions";
import { ARTICLE_STATUSES } from "@/blog/types/article-status";
import type {
  ArticleListItem,
  ArticleSearchFilters,
  ArticleSearchResult,
  ArticleSortField,
} from "@/blog/types/article-search";
import type { ResolvedArticleCategory } from "@/blog/types/article-category";

const ALL = "all";

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

/**
 * `/admin/articles`'s interactive shell — search, filters, sortable
 * columns, and pagination are all URL search-param-driven (a real
 * server-side re-fetch via `router.push` on every change), mirroring
 * `CoursesManager` exactly.
 */
export function ArticlesManager({
  result,
  filters,
  categories,
}: {
  result: ArticleSearchResult<ArticleListItem>;
  filters: ArticleSearchFilters;
  categories: ResolvedArticleCategory[];
}) {
  const t = useTranslations("Admin.articles");
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
    router.push(query ? `/admin/articles?${query}` : "/admin/articles", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const sortBy: ArticleSortField = filters.sortBy ?? "updatedAt";
  const sortDirection = filters.sortDirection ?? "desc";

  function handleSort(field: ArticleSortField) {
    const nextDirection = sortBy === field && sortDirection === "desc" ? "asc" : "desc";
    updateParams({ sortBy: field, sortDir: nextDirection }, false);
  }

  function sortIndicator(field: ArticleSortField) {
    if (sortBy !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  }

  const sortableColumns = [
    { field: "status" as const, label: t("columns.status") },
    { field: "viewCount" as const, label: t("columns.views") },
    { field: "publishedAt" as const, label: t("columns.publishedAt") },
    { field: "updatedAt" as const, label: t("columns.updatedAt") },
  ];

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
          <>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/articles/categories" />}>
              <Tags aria-hidden="true" />
              {t("manageCategories")}
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/admin/articles/series" />}><Layers3 aria-hidden="true" />{t("manageSeries")}</Button>
            <Button size="sm" nativeButton={false} render={<Link href="/admin/articles/new" />}>
              <Plus aria-hidden="true" />
              {t("createArticle")}
            </Button>
          </>
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
            {ARTICLE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
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
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {result.items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <Button size="sm" nativeButton={false} render={<Link href="/admin/articles/new" />}>
                  <Plus aria-hidden="true" />
                  {t("createArticle")}
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("slug")}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {t("columns.article")}
                    {sortIndicator("slug")}
                  </button>
                </TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.author")}</TableHead>
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
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {article.coverImageUrl ? (
                        <Image
                          src={article.coverImageUrl}
                          alt=""
                          width={40}
                          height={40}
                          sizes="40px"
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
                        <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                          {article.isFeatured && (
                            <Star aria-label={t("featured")} className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                          )}
                          {article.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{article.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{article.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{article.authorName ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={article.status}>{t(`status.${article.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{article.viewCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {article.publishedAt ? formatDate(article.publishedAt, locale) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(article.updatedAt, locale)}</TableCell>
                  <TableCell>
                    <ArticleRowActions article={article} />
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
