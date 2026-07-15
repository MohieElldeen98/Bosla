import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, PenLine } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { SessionService } from "@/auth/services/session.service";
import { ArticleService } from "@/blog/services/article.service";
import { ArticleCategoryService } from "@/blog/services/article-category.service";
import { isBlogManager } from "@/blog/utils/require-blog-access";
import { ArticleEditorForm } from "@/components/admin/blog/ArticleEditorForm";
import { PublishArticleControls } from "@/components/blog/PublishArticleControls";
import type { Locale } from "@/i18n/routing";

/**
 * `/blog/[slug]/edit` — the author-facing Edit Article page: the same
 * editor as the Admin Panel's, plus publish/unpublish controls, reachable
 * from the article page's Edit button and the blog's "My articles" strip.
 * An article that isn't the caller's own (and the caller isn't a blog
 * manager) 404s, indistinguishably from a missing slug — the same "can't
 * tell those apart and shouldn't" reasoning as
 * `CourseService.getOwnById`. Every mutation re-checks server-side.
 */
export default async function EditBlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  const article = await ArticleService.getBySlug(slug);
  if (!article || !(await ArticleService.canManageArticle(user!, article))) {
    notFound();
  }

  const [t, categories] = await Promise.all([
    getTranslations({ locale, namespace: "Blog.author" }),
    ArticleCategoryService.listActiveResolved(locale as Locale),
  ]);

  const manager = isBlogManager(user!);

  return (
    <div>
      {/* Header band — mirrors /blog/new's. */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 pt-32 pb-10 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            {t("backToBlog")}
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PenLine aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{t("editTitle")}</h1>
              <p className="mt-1 text-muted-foreground">{t("editDescription")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="mb-6">
          <PublishArticleControls articleId={article.id} slug={article.slug} status={article.status} />
        </div>
        <ArticleEditorForm
          mode="edit"
          article={article}
          seo={null}
          categories={categories}
          listHref="/blog"
          editHrefTemplate="/blog/{slug}/edit"
          showFeaturedField={manager}
          showSeoSection={false}
        />
      </div>
    </div>
  );
}
