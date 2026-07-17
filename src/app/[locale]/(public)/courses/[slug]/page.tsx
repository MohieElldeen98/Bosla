import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { BookOpen, Check, Clock, GraduationCap, Languages, LockKeyhole, UserRound } from "lucide-react";
import { CourseService } from "@/courses/services/course.service";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { CourseCard } from "@/components/courses/CourseCard";
import { CurriculumTree } from "@/components/courses/CurriculumTree";
import { DealCountdown } from "@/components/courses/DealCountdown";
import { DescriptionClamp } from "@/components/courses/DescriptionClamp";
import { EnrollmentState } from "@/components/courses/EnrollmentState";
import { PriceBlock } from "@/components/courses/PriceBlock";
import { SectionAnchorTabs } from "@/components/courses/SectionAnchorTabs";
import { TrailerPreview } from "@/components/courses/TrailerPreview";
import { MobilePurchaseBar } from "@/components/courses/MobilePurchaseBar";

/**
 * ISR is safe here even though the purchase area is enrollment-aware:
 * everything session-dependent (`EnrollmentState`) resolves client-side
 * against a Server Action, so the cached page is identical for every
 * visitor. 60s matches the catalog — a price or curriculum edit should
 * reach both surfaces on the same cadence.
 */
export const revalidate = 60;

function formatDuration(minutes: number | null, locale: string): string {
  if (minutes === null) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(minutes / 60);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const course = await CourseService.getPublicDetailBySlug(slug, locale as Locale);
  if (!course) {
    const t = await getTranslations({ locale, namespace: "CourseCatalog.detail" });
    return { title: t("notFoundTitle") };
  }

  const title = course.seoTitle ?? course.title;
  const description = course.seoDescription ?? course.shortDescription ?? course.description;
  const canonical = course.seoCanonicalPath ?? `/${locale}/courses/${course.slug}`;
  const languages = Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/courses/${course.slug}`]));

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { ...languages, "x-default": `/${routing.defaultLocale}/courses/${course.slug}` },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(course.seoOgImageUrl ? { images: [{ url: course.seoOgImageUrl }] } : {}),
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const course = await CourseService.getPublicDetailBySlug(slug, locale as Locale);
  if (!course) notFound();

  const [t, tCard, tDifficulty, tLanguage, related] = await Promise.all([
    getTranslations({ locale, namespace: "CourseCatalog.detail" }),
    getTranslations({ locale, namespace: "CourseCatalog.card" }),
    getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
    getTranslations({ locale, namespace: "CourseCatalog.language" }),
    CourseService.searchResolved(
      {
        status: "published",
        onlyActive: true,
        categoryId: course.categoryId ?? undefined,
        specialtyId: course.categoryId ? undefined : course.specialtyId,
        pageSize: 4,
      },
      locale as Locale,
    ),
  ]);
  const relatedCourses = related.items.filter((item) => item.id !== course.id).slice(0, 3);

  const hasDeal =
    course.originalPrice !== null &&
    Number(course.originalPrice) > Number(course.price) &&
    course.saleEndsAt !== null &&
    new Date(course.saleEndsAt) > new Date();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.shortDescription ?? course.description,
    provider: { "@type": "Organization", name: "Bosla" },
    instructor: { "@type": "Person", name: course.instructorName },
    offers: { "@type": "Offer", price: course.isFree ? "0" : course.price, priceCurrency: course.currency },
  };

  const instructorAvatar = course.instructorAvatarUrl ? (
    <Image
      src={course.instructorAvatarUrl}
      alt=""
      width={40}
      height={40}
      className="size-10 rounded-full object-cover"
    />
  ) : (
    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
      <UserRound className="size-5" aria-hidden="true" />
    </span>
  );

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: text-first on the muted band — the cover image deliberately
          lives in the purchase card as the trailer poster, not here. */}
      <section className="relative overflow-hidden border-b border-border bg-muted/50 py-10 sm:py-14">
        <div className="pointer-events-none absolute -end-20 -top-20 size-64 rounded-full border-[24px] border-primary/5" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label={t("breadcrumb")}>
            <Link href={`/courses?specialtyId=${course.specialtyId}`} className="hover:text-primary">
              {course.specialtyName}
            </Link>
            {course.categoryName && (
              <>
                <span aria-hidden="true">›</span>
                <Link href={`/courses?categoryId=${course.categoryId}`} className="hover:text-primary">
                  {course.categoryName}
                </Link>
              </>
            )}
          </nav>
          <div className="max-w-4xl">
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">{course.title}</h1>
            {course.subtitle && <p className="mt-4 text-lg text-muted-foreground sm:text-xl">{course.subtitle}</p>}
            <Link href="#instructor" className="mt-6 flex w-fit items-center gap-3 text-start">
              {instructorAvatar}
              <span>
                <span className="block font-medium">{course.instructorName}</span>
                <span className="text-sm text-muted-foreground">{course.instructorQualification}</span>
              </span>
            </Link>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span>{tDifficulty(course.level)}</span>
              <span>{formatDuration(course.estimatedDurationMinutes, locale)} {t("hours")}</span>
              <span>{tCard("lessonCount", { count: course.lessonCount })}</span>
              <span>{tLanguage(course.language)}</span>
              <span>{t("updated", { date: formatDate(course.updatedAt, locale) })}</span>
            </div>
          </div>
        </div>
      </section>

      <SectionAnchorTabs
        sections={[
          { id: "overview", label: t("overview") },
          { id: "curriculum", label: t("curriculumTitle") },
          { id: "instructor", label: t("instructorTitle") },
        ]}
        navLabel={t("sectionsNav")}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-3 lg:px-8">
        <div className="order-last space-y-12 lg:order-first lg:col-span-2">
          <section id="overview" className="scroll-mt-28">
            <h2 className="text-2xl font-semibold">{t("objectivesTitle")}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {course.learningObjectives.map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section id="curriculum" className="scroll-mt-28">
            <h2 className="text-2xl font-semibold">{t("curriculumTitle")}</h2>
            <div className="mt-5">
              <CurriculumTree tree={course.curriculum} mode="marketing" previewVideoUrls={course.previewVideoUrls} />
            </div>
          </section>

          {course.requirements.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold">{t("requirementsTitle")}</h2>
              <ul className="mt-5 list-disc space-y-2 ps-5 text-muted-foreground">
                {course.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-semibold">{t("descriptionTitle")}</h2>
            <div className="mt-5">
              <DescriptionClamp description={course.description} />
            </div>
          </section>

          {course.targetAudience.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold">{t("audienceTitle")}</h2>
              <ul className="mt-5 list-disc space-y-2 ps-5 text-muted-foreground">
                {course.targetAudience.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <section id="instructor" className="scroll-mt-28">
            <h2 className="text-2xl font-semibold">{t("instructorTitle")}</h2>
            <div className="mt-5 rounded-xl border border-border p-6">
              <div className="flex items-center gap-4">
                {course.instructorAvatarUrl ? (
                  <Image
                    src={course.instructorAvatarUrl}
                    alt=""
                    width={72}
                    height={72}
                    className="size-[72px] rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-[72px] items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-8" aria-hidden="true" />
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{course.instructorName}</h3>
                  <p className="text-muted-foreground">{course.instructorQualification}</p>
                  {course.instructorExperienceYears !== null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("experience", { years: course.instructorExperienceYears })}
                    </p>
                  )}
                </div>
              </div>
              {course.instructorBio && (
                <p className="mt-5 whitespace-pre-line text-muted-foreground">{course.instructorBio}</p>
              )}
            </div>
          </section>

          {relatedCourses.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold">{t("relatedTitle")}</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {relatedCourses.map((item) => (
                  <CourseCard key={item.id} course={item} locale={locale} t={tCard} tDifficulty={tDifficulty} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="order-first lg:order-last lg:col-span-1">
          <div className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-20">
            <TrailerPreview
              coverUrl={course.coverImageUrl}
              trailerUrl={course.trailerVideoUrl}
              title={course.title}
              playLabel={t("playTrailer")}
            />
            <div id="purchase-cta" className="px-2">
              <PriceBlock
                price={course.price}
                originalPrice={course.originalPrice}
                currency={course.currency}
                isFree={course.isFree}
                locale={locale}
                freeLabel={t("free")}
                discountLabel={(percentage) => t("discount", { percentage })}
              />
              {hasDeal && course.saleEndsAt && (
                <div className="mt-3">
                  <DealCountdown saleEndsAt={course.saleEndsAt} />
                </div>
              )}
              <EnrollmentState courseId={course.id} slug={course.slug} isFree={course.isFree} />
              <ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <Clock className="size-4 shrink-0" aria-hidden="true" />
                  {formatDuration(course.estimatedDurationMinutes, locale)} {t("hours")}
                </li>
                <li className="flex gap-3">
                  <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                  {tCard("lessonCount", { count: course.lessonCount })}
                </li>
                <li className="flex gap-3">
                  <Languages className="size-4 shrink-0" aria-hidden="true" />
                  {tLanguage(course.language)}
                </li>
                <li className="flex gap-3">
                  <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
                  {tDifficulty(course.level)}
                </li>
                {course.certificateAvailable && (
                  <li className="flex gap-3">
                    <GraduationCap className="size-4 shrink-0" aria-hidden="true" />
                    {t("certificate")}
                  </li>
                )}
                <li className="flex gap-3">
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  {t("lifetimeAccess")}
                </li>
              </ul>
              <p className="mt-5 text-xs text-muted-foreground">{t("refundGuarantee")}</p>
            </div>
          </div>
        </aside>
      </main>

      <MobilePurchaseBar
        price={course.price}
        originalPrice={course.originalPrice}
        currency={course.currency}
        isFree={course.isFree}
        locale={locale}
        slug={course.slug}
      />
    </div>
  );
}
