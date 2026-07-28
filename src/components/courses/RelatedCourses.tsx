import { getTranslations } from "next-intl/server";
import { CourseService } from "@/courses/services/course.service";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseCardSkeleton } from "@/components/courses/CourseCardSkeleton";
import type { Locale } from "@/i18n/routing";

/**
 * The course detail page's "related courses" rail — split out from the
 * page body and rendered inside a `<Suspense>` boundary (Performance
 * Sprint 1) so this non-critical, below-the-fold search query never
 * blocks the page's primary content (hero, curriculum, purchase card)
 * from streaming to the browser first.
 */
export async function RelatedCourses({
  courseId,
  categoryId,
  specialtyId,
  locale,
}: {
  courseId: string;
  categoryId: string | null;
  specialtyId: string;
  locale: Locale;
}) {
  const [t, tCard, tDifficulty, related] = await Promise.all([
    getTranslations({ locale, namespace: "CourseCatalog.detail" }),
    getTranslations({ locale, namespace: "CourseCatalog.card" }),
    getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
    CourseService.searchResolved(
      {
        status: "published",
        onlyActive: true,
        categoryId: categoryId ?? undefined,
        specialtyId: categoryId ? undefined : specialtyId,
        pageSize: 4,
      },
      locale,
    ),
  ]);
  const relatedCourses = related.items.filter((item) => item.id !== courseId).slice(0, 3);

  if (relatedCourses.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{t("relatedTitle")}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {relatedCourses.map((item) => (
          <CourseCard key={item.id} course={item} locale={locale} t={tCard} tDifficulty={tDifficulty} />
        ))}
      </div>
    </section>
  );
}

/** Matches `RelatedCourses`' own grid so the `<Suspense>` fallback holds
 *  the same layout footprint while the query resolves. */
export function RelatedCoursesSkeleton() {
  return (
    <section>
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" aria-hidden="true" />
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <CourseCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
