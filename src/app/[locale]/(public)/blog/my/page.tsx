import { getTranslations } from "next-intl/server";
import { ArrowLeft, Eye, Newspaper, PenLine, Plus } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { SessionService } from "@/auth/services/session.service";
import { ArticleService } from "@/blog/services/article.service";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";

/** Session-gated, same as `/blog/new` — never statically prerendered. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

/**
 * `/blog/my` — the author's own articles (drafts included; drafts never
 * appear in the public grid, so this is also how an author finds one
 * again), reached from the navbar's author-only "My Articles" link.
 * Server-rendered through `searchResolvedForAuthor`, which forces the
 * author filter to the caller — no one can list another author's drafts.
 */
export default async function MyArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const rawPage = rawSearchParams.page;
  const parsedPage = Number.parseInt(Array.isArray(rawPage) ? rawPage[0] : rawPage ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }
  if (!isRoleAllowed(user!.role, ["instructor", "admin", "super_admin"])) {
    redirect({ href: "/blog", locale });
  }

  const [t, tStatus, tPagination, result] = await Promise.all([
    getTranslations({ locale, namespace: "Blog.author" }),
    getTranslations({ locale, namespace: "Admin.articles.status" }),
    getTranslations({ locale, namespace: "Blog.listing.pagination" }),
    ArticleService.searchResolvedForAuthor(
      user!,
      { sortBy: "updatedAt", sortDirection: "desc", page, pageSize: PAGE_SIZE },
      locale as Locale,
    ),
  ]);

  return (
    <div>
      {/* Header band — mirrors /blog/new's. */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-6 pt-32 pb-10 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            {t("backToBlog")}
          </Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Newspaper aria-hidden="true" className="size-6" />
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{t("myArticles")}</h1>
                <p className="mt-1 text-muted-foreground">{t("myArticlesDescription")}</p>
              </div>
            </div>
            <Button nativeButton={false} render={<Link href="/blog/new" />}>
              <Plus aria-hidden="true" className="size-4" />
              {t("writeArticle")}
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        {result.items.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-20 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PenLine aria-hidden="true" className="size-6" />
            </span>
            <p className="text-base font-semibold text-foreground">{t("myArticlesEmptyTitle")}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("myArticlesEmptyDescription")}</p>
            <Button className="mt-6" nativeButton={false} render={<Link href="/blog/new" />}>
              <Plus aria-hidden="true" className="size-4" />
              {t("writeArticle")}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-5">
            {result.items.map((article) => (
              <li key={article.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p dir="auto" className="truncate font-medium text-foreground">
                    {article.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span
                      className={
                        article.status === "published"
                          ? "font-medium text-emerald-600"
                          : "font-medium text-amber-600"
                      }
                    >
                      {tStatus(article.status)}
                    </span>
                    {article.categoryName && <> · {article.categoryName}</>}
                    {" · "}
                    {formatDate(article.updatedAt, locale)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {article.status === "published" && (
                    <Link
                      href={`/blog/${article.slug}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      <Eye aria-hidden="true" className="size-3.5" />
                      {t("viewArticle")}
                    </Link>
                  )}
                  <Link
                    href={`/blog/${article.slug}/edit`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <PenLine aria-hidden="true" className="size-3.5" />
                    {t("edit")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <BlogPagination
          basePath="/blog/my"
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pageSize={result.pageSize}
          queryString=""
          summaryLabel={(range) => tPagination("summary", range)}
          previousLabel={tPagination("previous")}
          nextLabel={tPagination("next")}
        />
      </div>
    </div>
  );
}
