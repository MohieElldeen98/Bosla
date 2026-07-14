import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { ArticleViewTracker } from "@/components/blog/ArticleViewTracker";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ArticleService } from "@/blog/services/article.service";
import { routing, type Locale } from "@/i18n/routing";

/** ISR, same reasoning as the blog listing — an article's content only
 *  changes on an admin save, and the one per-reader signal (view count)
 *  is tracked client-side (`ArticleViewTracker`) precisely so this page
 *  can stay cached. */
export const revalidate = 60;

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await ArticleService.getPublicDetailBySlug(slug, locale as Locale);

  if (!article) {
    const t = await getTranslations({ locale, namespace: "Blog.metadata" });
    return { title: t("title") };
  }

  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.excerpt ?? undefined;
  // Admin-set canonical is a deliberate raw override, used exactly as
  // entered — same convention as the course detail page.
  const canonical = article.seoCanonicalPath ?? `/${locale}/blog/${article.slug}`;
  const ogImage = article.seoOgImageUrl ?? article.coverImageUrl;
  const languages = Object.fromEntries(
    routing.locales.map((loc) => [loc, `/${loc}/blog/${article.slug}`]),
  );

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      ...(article.publishedAt ? { publishedTime: article.publishedAt } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

/**
 * `/blog/[slug]` — the public article page: cover hero, centered title +
 * read-time/category/author meta, the sanitized HTML body rendered with
 * the same `.rich-text-content` styles the admin editor writes in, share
 * buttons (sticky rail + footer row), an author card, and related
 * articles. Drafts and articles in deactivated categories 404
 * (`getPublicDetailBySlug` returns `null` for both, indistinguishably).
 */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  const article = await ArticleService.getPublicDetailBySlug(slug, locale as Locale);
  if (!article) notFound();

  const [t, tCard, rawArticle] = await Promise.all([
    getTranslations({ locale, namespace: "Blog.article" }),
    getTranslations({ locale, namespace: "Blog.card" }),
    ArticleService.getBySlug(slug),
  ]);

  const related = rawArticle ? await ArticleService.listRelated(rawArticle, locale as Locale, 3) : [];

  const authorName = article.authorName ?? t("teamAuthor");
  const shareLabels = {
    facebook: t("shareOnFacebook"),
    x: t("shareOnX"),
    linkedin: t("shareOnLinkedIn"),
    email: t("shareByEmail"),
    copyLink: t("copyLink"),
    linkCopied: t("linkCopied"),
  };

  const authorAvatar = article.authorAvatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={article.authorAvatarUrl}
      alt=""
      className="size-full rounded-full object-cover ring-1 ring-foreground/10"
    />
  ) : (
    <span className="flex size-full items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
      {authorName.charAt(0)}
    </span>
  );

  return (
    <article>
      <ArticleViewTracker articleId={article.id} />

      {/* Cover hero on a muted band, like the reference's post header. */}
      <div className="bg-muted/40">
        <div className="mx-auto max-w-4xl px-6 pt-10 lg:px-8">
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImageUrl}
              alt=""
              className="aspect-[2/1] w-full translate-y-10 rounded-2xl object-cover shadow-lg ring-1 ring-foreground/10"
            />
          ) : (
            <div className="h-10" />
          )}
        </div>
      </div>

      <div className={article.coverImageUrl ? "pt-20" : "pt-10"}>
        <header className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("minRead", { minutes: article.readTimeMinutes })}
            {article.categoryName && article.categorySlug && (
              <>
                {" · "}
                {t("postedIn")}{" "}
                <Link
                  href={`/blog?category=${article.categorySlug}`}
                  className="text-primary underline underline-offset-2"
                >
                  {article.categoryName}
                </Link>
              </>
            )}
            {article.publishedAt && (
              <>
                {" · "}
                {t("publishedOn", { date: formatDate(article.publishedAt, locale) })}
              </>
            )}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="size-10 shrink-0">{authorAvatar}</span>
            <span className="text-sm text-muted-foreground">{t("writtenBy", { name: authorName })}</span>
          </div>
        </header>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          {/* Sticky share rail — wide screens only; the footer share row
              below covers touch devices. */}
          <aside className="absolute top-12 bottom-0 start-0 hidden lg:block" aria-hidden="false">
            <div className="sticky top-28">
              <ShareButtons title={article.title} orientation="vertical" labels={shareLabels} />
            </div>
          </aside>

          <div
            className="rich-text-content mx-auto mt-12 max-w-3xl"
            // Sanitized at write time by `sanitizeArticleBody` — the DB
            // never holds unsanitized markup (see PublicArticleDetail).
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        </div>

        {/* Author card + share footer. */}
        <footer className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mt-16 flex flex-col items-center border-t border-border pt-10 text-center">
            <span className="size-16">{authorAvatar}</span>
            <p className="mt-3 font-semibold text-foreground">{authorName}</p>
            {article.authorBio && (
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">{article.authorBio}</p>
            )}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl bg-muted/40 px-6 py-8">
            <p className="text-lg font-semibold text-foreground">{t("shareTitle")}</p>
            <ShareButtons title={article.title} labels={shareLabels} />
          </div>

          <div className="mt-10 pb-4 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
              {t("backToBlog")}
            </Link>
          </div>
        </footer>

        {/* Related articles. */}
        {related.length > 0 && (
          <section aria-labelledby="related-articles" className="border-t border-border bg-muted/20">
            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
              <h2 id="related-articles" className="text-xl font-semibold tracking-tight sm:text-2xl">
                {t("relatedArticles")}
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <ArticleCard key={item.id} article={item} t={tCard} teamAuthorLabel={t("teamAuthor")} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
