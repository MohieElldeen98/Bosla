import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { publicSearchCoursesSchema, PUBLIC_COURSE_SORT_FIELDS } from "@/courses/validators/course.validator";
import { COURSE_LANGUAGES } from "@/courses/types/course-language";
import { COURSE_LEVELS } from "@/courses/types/course-level";
import { CourseCard } from "@/components/courses/CourseCard";
import { AddCourseButton } from "@/components/courses/AddCourseButton";
import {
  CourseCatalogFilters,
  CourseCatalogSearchForm,
  ResetCatalogButton,
  SpecialtyChips,
} from "@/components/courses/CourseCatalogFilters";
import { CourseCatalogPagination } from "@/components/courses/CourseCatalogPagination";
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
  const raw = await searchParams;
  const parsed = publicSearchCoursesSchema.safeParse({
    query: firstValue(raw.q),
    specialtyId: firstValue(raw.specialtyId),
    categoryId: firstValue(raw.categoryId),
    language: firstValue(raw.language),
    level: firstValue(raw.level),
    price: firstValue(raw.price),
    featured: firstValue(raw.featured),
    sortBy: firstValue(raw.sortBy),
    sortDirection: firstValue(raw.sortDir),
    page: firstValue(raw.page),
    pageSize: firstValue(raw.pageSize),
  });
  const parsedFilters = parsed.success ? parsed.data : {};
  const filters = {
    ...parsedFilters,
    isFree:
      parsedFilters.price === "free"
        ? true
        : parsedFilters.price === "paid"
          ? false
          : undefined,
  };
  const hasActiveState = Boolean(
    filters.query ||
      filters.specialtyId ||
      filters.categoryId ||
      filters.language ||
      filters.level ||
      filters.price ||
      filters.featured ||
      (filters.page ?? 1) > 1,
  );
  const featuredPromise = hasActiveState
    ? Promise.resolve({ items: [] as never[] })
    : CourseService.searchResolved(
        { status: "published", onlyActive: true, featured: true, pageSize: 3 },
        locale as Locale,
      );

  const [t, tCard, tDifficulty, tLanguage, result, specialties, categories, featuredResult] =
    await Promise.all([
      getTranslations({ locale, namespace: "CourseCatalog" }),
      getTranslations({ locale, namespace: "CourseCatalog.card" }),
      getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
      getTranslations({ locale, namespace: "CourseCatalog.language" }),
      CourseService.searchResolved(
        { ...filters, status: "published", onlyActive: true },
        locale as Locale,
      ),
      SpecialtyService.listResolved(locale as Locale),
      CategoryService.listResolved(locale as Locale),
      featuredPromise,
    ]);
  const difficultyLabels = Object.fromEntries(
    COURSE_LEVELS.map((level) => [level, tDifficulty(level)]),
  );
  const languageLabels = Object.fromEntries(
    COURSE_LANGUAGES.map((language) => [language, tLanguage(language)]),
  );
  const sortLabels = {
    ...Object.fromEntries(PUBLIC_COURSE_SORT_FIELDS.map((field) => [field, t(`sort.${field}`)])),
    priceLow: t("sort.priceLow"),
    priceHigh: t("sort.priceHigh"),
  };
  const paginationParams = new URLSearchParams();
  if (filters.query) paginationParams.set("q", filters.query);
  if (filters.specialtyId) paginationParams.set("specialtyId", filters.specialtyId);
  if (filters.categoryId) paginationParams.set("categoryId", filters.categoryId);
  if (filters.language) paginationParams.set("language", filters.language);
  if (filters.level) paginationParams.set("level", filters.level);
  if (filters.price) paginationParams.set("price", filters.price);
  if (filters.sortBy) paginationParams.set("sortBy", filters.sortBy);
  if (filters.sortDirection) paginationParams.set("sortDir", filters.sortDirection);

  const activeSpecialty = specialties.find((specialty) => specialty.id === filters.specialtyId);
  const activeCategory = categories.find((category) => category.id === filters.categoryId);
  const filterLabels = {
    searchPlaceholder: t("searchPlaceholder"),
    searchLabel: t("searchLabel"),
    allCategories: t("filters.allCategories"),
    allLanguages: t("filters.allLanguages"),
    allDifficulties: t("filters.allDifficulties"),
    allPrices: t("filters.allPrices"),
    free: t("filters.free"),
    paid: t("filters.paid"),
    filters: t("filters.title"),
    apply: t("filters.apply"),
    reset: t("filters.reset"),
    sortLabel: t("sortLabel"),
    sort: sortLabels,
    language: languageLabels,
    difficulty: difficultyLabels,
  };

  return (
    <div>
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 pt-32 pb-14 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {t("eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("metadata.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">{t("valueProposition")}</p>
            </div>
            <AddCourseButton />
          </div>
          <div className="mt-8 max-w-3xl">
            <CourseCatalogSearchForm
              initialQuery={filters.query ?? ""}
              placeholder={t("searchPlaceholder")}
              label={t("searchLabel")}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <SpecialtyChips
          specialties={specialties.filter((specialty) => specialty.isActive)}
          activeId={filters.specialtyId}
          allLabel={t("allSpecialties")}
        />
        <div className="mt-6">
          <CourseCatalogFilters
            filters={filters}
            categories={categories.filter((category) => category.isActive)}
            labels={filterLabels}
          />
        </div>

        {featuredResult.items.length > 0 && (
          <section aria-labelledby="courses-featured" className="mb-14 mt-12">
            <h2 id="courses-featured" className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t("featured")}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredResult.items.slice(0, 3).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  locale={locale}
                  t={tCard}
                  tDifficulty={tDifficulty}
                />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="courses-results" className="mt-10">
          <h2 id="courses-results" className="text-xl font-semibold tracking-tight sm:text-2xl">
            {filters.query
              ? t("resultsFor", { query: filters.query })
              : activeCategory?.name ?? activeSpecialty?.name ?? t("allCourses")}
          </h2>
          {result.items.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-20 text-center">
              <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen aria-hidden="true" className="size-6" />
              </span>
              <p className="text-base font-semibold text-foreground">
                {hasActiveState ? t("emptyTitle") : t("emptyCatalogTitle")}
              </p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {hasActiveState ? t("emptyDescription") : t("emptyCatalogDescription")}
              </p>
              {hasActiveState ? (
                <div className="mt-5">
                  <ResetCatalogButton label={t("filters.reset")} />
                </div>
              ) : (
                <Link
                  className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href="/blog"
                >
                  {t("emptyCatalogLink")}
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  locale={locale}
                  t={tCard}
                  tDifficulty={tDifficulty}
                />
              ))}
            </div>
          )}
          <CourseCatalogPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            queryString={paginationParams.toString()}
            summaryLabel={(range) => t("pagination.summary", range)}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
          />
        </section>
      </div>
    </div>
  );
}
