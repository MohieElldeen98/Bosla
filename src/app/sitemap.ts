import type { MetadataRoute } from "next";
import { ArticleService } from "@/blog/services/article.service";
import { CourseService } from "@/courses/services/course.service";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-config";

/** Hourly is plenty — publishing is rare, and both service reads fall back
 *  to `[]` on a DB error, so a failed regeneration only drops the dynamic
 *  entries until the next one. */
export const revalidate = 3600;

const STATIC_PATHS = ["", "/courses", "/blog", "/contact", "/privacy", "/terms", "/refunds"];

function localizedEntries(path: string, lastModified?: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, new URL(`/${locale}${path}`, siteUrl).toString()]),
  );
  return routing.locales.map((locale) => ({
    url: languages[locale],
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, courses] = await Promise.all([
    ArticleService.list(),
    CourseService.listPublished(),
  ]);

  return [
    ...STATIC_PATHS.flatMap((path) => localizedEntries(path)),
    ...courses.flatMap((course) =>
      localizedEntries(`/courses/${encodeURIComponent(course.slug)}`, course.updatedAt),
    ),
    ...articles
      .filter((article) => article.status === "published")
      .flatMap((article) =>
        localizedEntries(`/blog/${encodeURIComponent(article.slug)}`, article.updatedAt),
      ),
  ];
}
