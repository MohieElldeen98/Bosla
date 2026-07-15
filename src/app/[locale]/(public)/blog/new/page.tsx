import { getTranslations } from "next-intl/server";
import { ArrowLeft, PenLine } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { SessionService } from "@/auth/services/session.service";
import { ArticleCategoryService } from "@/blog/services/article-category.service";
import { ArticleEditorForm } from "@/components/admin/blog/ArticleEditorForm";
import type { Locale } from "@/i18n/routing";

/** Session-gated: without this, the build statically prerenders the page
 *  with no session and bakes the sign-in redirect in for everyone. */
export const dynamic = "force-dynamic";

/**
 * `/blog/new` — the author-facing Create Article page, under the public
 * chrome (navbar/footer) so an Instructor never needs the Admin Panel.
 * Session-dependent, so deliberately not ISR (unlike `/blog` itself).
 * Guests are sent to sign-in, signed-in non-authors back to the blog;
 * `ArticleService.create` re-checks the role server-side regardless.
 * Manager-only surfaces (featured pin, SEO) are hidden — admins have the
 * full editor at `/admin/articles`.
 */
export default async function NewBlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }
  if (!isRoleAllowed(user!.role, ["instructor", "admin", "super_admin"])) {
    redirect({ href: "/blog", locale });
  }

  const [t, categories] = await Promise.all([
    getTranslations({ locale, namespace: "Blog.author" }),
    ArticleCategoryService.listActiveResolved(locale as Locale),
  ]);

  return (
    <div>
      {/* Header band — mirrors the blog listing's own header language. */}
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
              <h1 className="text-3xl font-semibold tracking-tight">{t("createTitle")}</h1>
              <p className="mt-1 text-muted-foreground">{t("createDescription")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <ArticleEditorForm
          mode="create"
          article={null}
          seo={null}
          categories={categories}
          listHref="/blog"
          editHrefTemplate="/blog/{slug}/edit"
          showFeaturedField={false}
          showSeoSection={false}
        />
      </div>
    </div>
  );
}
