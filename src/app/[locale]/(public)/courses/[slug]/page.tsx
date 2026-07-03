import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookOpen, CheckCircle2, Clock, GraduationCap, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CourseService } from "@/courses/services/course.service";
import { SessionService } from "@/auth/services/session.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { routing, type Locale } from "@/i18n/routing";

// No `revalidate` — the purchase CTA needs a live session + enrollment
// check per request (same reasoning the Course Player, Step 4.4, is
// dynamic for), so this page can no longer be ISR'd. Correctness of "can
// this visitor buy/continue this course right now" matters more than
// shaving a cache-hit response time off an already-fast single-course
// lookup.

function formatPrice(price: string, currency: string, locale: string): string {
  const amount = Number(price);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDuration(minutes: number, locale: string): string {
  const hours = minutes / 60;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hours);
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
  // Locale-prefixed by default, same reasoning as `/courses`'s own
  // `generateMetadata` — but an admin-set `seoCanonicalPath` (via the
  // Course Editor's SEO section) is a deliberate, raw override and is
  // used exactly as entered, not locale-prefixed here.
  const canonical = course.seoCanonicalPath ?? `/${locale}/courses/${course.slug}`;
  const ogImage = course.seoOgImageUrl ?? course.coverImageUrl;
  const languages = Object.fromEntries(
    routing.locales.map((loc) => [loc, `/${loc}/courses/${course.slug}`]),
  );

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
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
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

  if (!course) {
    notFound();
  }

  const [t, tDifficulty, tLanguage, user] = await Promise.all([
    getTranslations({ locale, namespace: "CourseCatalog.detail" }),
    getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
    getTranslations({ locale, namespace: "CourseCatalog.language" }),
    SessionService.getCurrentUser(),
  ]);
  const enrolled = user ? await EnrollmentService.isEnrolled(user.id, course.id) : false;

  return (
    <div>
      <div className="relative flex h-64 items-end overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent sm:h-80">
        {course.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <BookOpen aria-hidden="true" className="absolute -end-8 -bottom-8 size-56 text-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative mx-auto w-full max-w-5xl px-6 pb-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-1.5">
            {course.featured && <Badge className="border-none bg-white/90 text-foreground">{t("featured")}</Badge>}
            <Badge variant="secondary">{course.specialtyName}</Badge>
            {course.categoryName && <Badge variant="outline">{course.categoryName}</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
          {course.subtitle && <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{course.subtitle}</p>}
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-3 lg:px-8">
        <div className="space-y-10 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold text-foreground">{t("aboutTitle")}</h2>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">{course.description}</p>
          </section>

          {course.requirements.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t("requirementsTitle")}</h2>
              <ul className="mt-3 space-y-2">
                {course.requirements.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.learningObjectives.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t("objectivesTitle")}</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {course.learningObjectives.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <Target aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.targetAudience.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground">{t("audienceTitle")}</h2>
              <ul className="mt-3 space-y-2">
                {course.targetAudience.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <GraduationCap aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-baseline justify-between">
              {course.isFree ? (
                <span className="text-2xl font-semibold text-emerald-600">{t("free")}</span>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{formatPrice(course.price, course.currency, locale)}</span>
                  {course.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(course.originalPrice, course.currency, locale)}
                    </span>
                  )}
                </div>
              )}
            </div>
            {enrolled ? (
              <Link href={`/courses/${slug}/learn`} className={cn(buttonVariants(), "mt-4 w-full")}>
                {t("continueLearning")}
              </Link>
            ) : user ? (
              <Link href={`/checkout/${slug}`} className={cn(buttonVariants(), "mt-4 w-full")}>
                {course.isFree ? t("enrollFree") : t("buyNow")}
              </Link>
            ) : (
              <Link
                href={`/sign-in?redirectTo=${encodeURIComponent(`/checkout/${slug}`)}`}
                className={cn(buttonVariants(), "mt-4 w-full")}
              >
                {t("signInToEnroll")}
              </Link>
            )}

            <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("fields.instructor")}</dt>
                <dd className="font-medium text-foreground">{course.instructorName}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("fields.specialty")}</dt>
                <dd className="font-medium text-foreground">{course.specialtyName}</dd>
              </div>
              {course.categoryName && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{t("fields.category")}</dt>
                  <dd className="font-medium text-foreground">{course.categoryName}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("fields.difficulty")}</dt>
                <dd className="font-medium text-foreground">{tDifficulty(course.level)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("fields.language")}</dt>
                <dd className="font-medium text-foreground">{tLanguage(course.language)}</dd>
              </div>
              {course.estimatedDurationMinutes !== null && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock aria-hidden="true" className="size-4" />
                    {t("fields.duration")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {t("durationHours", { hours: formatDuration(course.estimatedDurationMinutes, locale) })}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <GraduationCap aria-hidden="true" className="size-4" />
                  {t("fields.certificate")}
                </dt>
                <dd className="font-medium text-foreground">
                  {course.certificateAvailable ? t("yes") : t("no")}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
