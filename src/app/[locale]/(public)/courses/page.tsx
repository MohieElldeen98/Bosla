import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { publicSearchCoursesSchema, PUBLIC_COURSE_SORT_FIELDS } from "@/courses/validators/course.validator";
import { COURSE_LANGUAGES } from "@/courses/types/course-language";
import { COURSE_LEVELS } from "@/courses/types/course-level";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseCatalogFilters } from "@/components/courses/CourseCatalogFilters";
import { CourseCatalogPagination } from "@/components/courses/CourseCatalogPagination";
import { BookOpen } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";

/**
 * ISR, same reasoning as the homepage (`src/app/[locale]/page.tsx`): no
 * `fetch()`/dynamic API is used to read the catalog (plain Drizzle/
 * postgres calls), so without this Next would statically render once at
 * build time and never re-check the database. Applies per distinct URL
 * here (each filter/page combination is its own cache entry), same as
 * any other ISR route with search-param-driven content.
 */
export const revalidate = 60;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CourseCatalog.metadata" });

  // Locale-prefixed, same as the root layout's own `generateMetadata`
  // (`src/app/[locale]/layout.tsx`) — `/en/courses` and `/ar/courses` are
  // genuinely different content (different language), so each needs its
  // own self-referencing canonical, cross-linked via `languages`, not a
  // single shared `/courses` canonical that would tell search engines
  // they're the same page.
  const canonical = `/${locale}/courses`;
  const languages = Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/courses`]));

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: { ...languages, "x-default": `/${routing.defaultLocale}/courses` },
    },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
    twitter: { title: t("title"), description: t("description") },
  };
}

export default async function CourseCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = publicSearchCoursesSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    specialtyId: firstValue(rawSearchParams.specialtyId),
    categoryId: firstValue(rawSearchParams.categoryId),
    language: firstValue(rawSearchParams.language),
    level: firstValue(rawSearchParams.level),
    featured: firstValue(rawSearchParams.featured),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const paginationParams = new URLSearchParams();
  if (filters.query) paginationParams.set("q", filters.query);
  if (filters.specialtyId) paginationParams.set("specialtyId", filters.specialtyId);
  if (filters.categoryId) paginationParams.set("categoryId", filters.categoryId);
  if (filters.language) paginationParams.set("language", filters.language);
  if (filters.level) paginationParams.set("level", filters.level);
  if (filters.featured) paginationParams.set("featured", "true");
  if (filters.sortBy) paginationParams.set("sortBy", filters.sortBy);
  if (filters.sortDirection) paginationParams.set("sortDir", filters.sortDirection);
  const paginationQueryString = paginationParams.toString();

  const [t, tMeta, tCard, tDifficulty, tLanguage, result, specialties, categories] = await Promise.all([
    getTranslations({ locale, namespace: "CourseCatalog" }),
    getTranslations({ locale, namespace: "CourseCatalog.metadata" }),
    getTranslations({ locale, namespace: "CourseCatalog.card" }),
    getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
    getTranslations({ locale, namespace: "CourseCatalog.language" }),
    CourseService.searchResolved(
      { ...filters, status: "published", onlyActive: true },
      locale as Locale,
    ),
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
  ]);

  const difficultyLabels = Object.fromEntries(COURSE_LEVELS.map((level) => [level, tDifficulty(level)]));
  const languageLabels = Object.fromEntries(COURSE_LANGUAGES.map((lang) => [lang, tLanguage(lang)]));
  const sortLabels = Object.fromEntries(
    PUBLIC_COURSE_SORT_FIELDS.map((field) => [field, t(`sort.${field}`)]),
  ) as Record<(typeof PUBLIC_COURSE_SORT_FIELDS)[number], string>;

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{tMeta("title")}</h1>
        <p className="mt-3 text-muted-foreground">{tMeta("description")}</p>
      </div>

      <div className="mt-10">
        <CourseCatalogFilters
          filters={filters}
          specialties={specialties}
          categories={categories}
          labels={{
            searchPlaceholder: t("searchPlaceholder"),
            allSpecialties: t("filters.allSpecialties"),
            allCategories: t("filters.allCategories"),
            allLanguages: t("filters.allLanguages"),
            allDifficulties: t("filters.allDifficulties"),
            featuredOnly: t("filters.featuredOnly"),
            sortLabel: t("sortLabel"),
            sort: sortLabels,
            language: languageLabels,
            difficulty: difficultyLabels,
          }}
        />
      </div>

      {result.items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-20 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen aria-hidden="true" className="size-6" />
          </span>
          <p className="text-base font-semibold text-foreground">{t("emptyTitle")}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              locale={locale}
              t={tCard}
              tDifficulty={tDifficulty}
              tLanguage={tLanguage}
            />
          ))}
        </div>
      )}

      <CourseCatalogPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        queryString={paginationQueryString}
        summaryLabel={(range) => t("pagination.summary", range)}
        previousLabel={t("pagination.previous")}
        nextLabel={t("pagination.next")}
      />
    </div>
  );
}
