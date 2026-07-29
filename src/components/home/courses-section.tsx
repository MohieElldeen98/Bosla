import { getTranslations } from "next-intl/server";
import { CourseService } from "@/courses/services/course.service";
import type { Locale } from "@/i18n/routing";
import { CoursesSectionClient } from "./courses-section-client";

export async function CoursesSection({ locale }: { locale: Locale }) {
  const [t, result] = await Promise.all([
    getTranslations({ locale, namespace: "CoursesSection" }),
    CourseService.searchResolved(
      { status: "published", onlyActive: true, featured: true, pageSize: 6 },
      locale,
    ),
  ]);

  if (result.items.length === 0) return null;

  return <CoursesSectionClient courses={result.items} translations={t} locale={locale} />;
}
