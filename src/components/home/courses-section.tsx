import { getTranslations } from "next-intl/server";
import { CourseService } from "@/courses/services/course.service";
import { CoursesSectionClient } from "@/components/home/courses-section-client";
import type { Locale } from "@/i18n/routing";

export async function CoursesSection({ locale }: { locale: Locale }) {
  const [t, result] = await Promise.all([
    getTranslations({ locale, namespace: "CoursesSection" }),
    CourseService.searchResolved(
      { status: "published", onlyActive: true, featured: true, pageSize: 6 },
      locale,
    ),
  ]);

  if (result.items.length === 0) return null;

  return (
    <CoursesSectionClient
      courses={result.items}
      locale={locale}
      eyebrow={t("eyebrow")}
      title={t("title")}
      viewAllLabel={t("viewAllLabel")}
      freeLabel={t("free")}
    />
  );
}
