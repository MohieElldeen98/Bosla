import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { SeoManager } from "@/components/admin/seo/SeoManager";
import { CmsPageService } from "@/cms/services/page.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { CourseService } from "@/courses/services/course.service";
import { ArticleService } from "@/blog/services/article.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { SeoContentItem } from "@/components/admin/seo/ContentSeoAccordion";
import type { Locale } from "@/i18n/routing";
import type { Course } from "@/courses/types/course";
import type { Article } from "@/blog/types/article";

/** A course/article created before `attachSeoMeta` existed can still have
 *  `seoMetaId: null` — this is a pure read (no attach-on-load: that
 *  method's own doc comment is explicit that it's meant to run "once, on
 *  demand, from an 'Add SEO' affordance", not automatically on every
 *  page view, and it isn't safe to call concurrently for the same row —
 *  its check-then-write isn't atomic). A `null` `seo` here means
 *  `ContentSeoAccordion` renders a "Set up SEO" button that calls the
 *  attach action itself, once, on click. */
async function resolveCourseSeo(course: Course, locale: Locale): Promise<SeoContentItem> {
  const seo = course.seoMetaId ? await CmsSeoService.getById(course.seoMetaId) : null;
  return {
    id: course.id,
    seoMetaId: course.seoMetaId,
    seo,
    title: resolveLocalizedText(course.title, locale),
    path: `/courses/${course.slug}`,
  };
}

async function resolveArticleSeo(article: Article, locale: Locale): Promise<SeoContentItem> {
  const seo = article.seoMetaId ? await CmsSeoService.getById(article.seoMetaId) : null;
  return {
    id: article.id,
    seoMetaId: article.seoMetaId,
    seo,
    title: resolveLocalizedText(article.title, locale),
    path: `/blog/${article.slug}`,
  };
}

/**
 * `/admin/seo` — search-result title/description, social preview image,
 * and canonical URL for the homepage, every Course, and every Article.
 * Fetches everything up front (no pagination): this admin panel's
 * realistic course/article counts are small, and `SeoForm`'s Media
 * Picker/character counters need the full bilingual record per item
 * regardless, so there's no lighter "list" projection to fetch instead.
 */
export default async function AdminSeoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, page, courses, articles] = await Promise.all([
    getTranslations("Admin.seo"),
    CmsPageService.getBySlug("home"),
    CourseService.list(),
    ArticleService.list(),
  ]);

  const [homepageSeo, courseItems, articleItems] = await Promise.all([
    page?.seoMetaId ? CmsSeoService.getById(page.seoMetaId) : Promise.resolve(null),
    Promise.all(courses.map((course) => resolveCourseSeo(course, locale as Locale))),
    Promise.all(articles.map((article) => resolveArticleSeo(article, locale as Locale))),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <SeoManager
        homepage={page?.seoMetaId && homepageSeo ? { seoMetaId: page.seoMetaId, seo: homepageSeo } : null}
        courses={courseItems}
        articles={articleItems}
      />
    </div>
  );
}
