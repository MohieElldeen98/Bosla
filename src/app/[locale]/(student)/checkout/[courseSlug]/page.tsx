import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Award, BookOpen, Clock, Infinity as InfinityIcon, Languages, ShieldCheck, SignpostBig, UserRound } from "lucide-react";
import { SessionService } from "@/auth/services/session.service";
import { redirect, Link } from "@/i18n/navigation";
import { CourseService } from "@/courses/services/course.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { PageTitle } from "@/components/admin/PageTitle";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/routing";

function formatDuration(minutes: number | null, locale: string): string {
  if (minutes === null) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(minutes / 60);
}

/**
 * `/checkout/[courseSlug]` — the real Checkout flow (Step 5.1), under
 * the same `(student)` route group `/dashboard` uses (any authenticated
 * role may enter — exactly who's allowed to purchase per
 * docs/roles-and-permissions.md §2). Course-availability validation and
 * the actual duplicate-purchase guard both live in
 * `OrderService.createFromCheckout` (the real enforcement); the redirect
 * here for an already-enrolled student is just a better UX than letting
 * them submit and get a rejection.
 *
 * Two-column layout mirrors the course detail page's convention: the
 * payment card is what the user came to act on, so on mobile it renders
 * first (`order-1`) with course context and trust signals below; on
 * desktop it's a sticky right-hand rail next to the fuller course
 * summary, the same "decision content beside a sticky purchase card"
 * pattern the details page's `PriceBlock`/`MobilePurchaseBar` use.
 */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ courseSlug: string; locale: string }>;
}) {
  const { courseSlug, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const course = await CourseService.getPublicDetailBySlug(courseSlug, locale as Locale);
  if (!course) {
    notFound();
  }

  const enrolled = await EnrollmentService.isEnrolled(user.id, course.id);
  if (enrolled) {
    redirect({ href: `/courses/${courseSlug}/learn`, locale: locale as Locale });
  }

  const [t, tDifficulty, tLanguage] = await Promise.all([
    getTranslations("Checkout"),
    getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
    getTranslations({ locale, namespace: "CourseCatalog.language" }),
  ]);

  const trustItems = [
    { icon: InfinityIcon, label: t("trust.lifetime") },
    ...(course.certificateAvailable ? [{ icon: Award, label: t("trust.certificate") }] : []),
    { icon: ShieldCheck, label: t("trust.guarantee") },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-8 lg:py-14">
      <div className="mb-8 flex items-start justify-between gap-4">
        <PageTitle title={t("title")} description={t("stepLabel")} />
        <Link
          href={`/courses/${courseSlug}`}
          className="hidden shrink-0 text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:inline-block"
        >
          {t("backToCourse")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:items-start">
        <div className="order-1 space-y-6 lg:order-2 lg:col-span-2 lg:sticky lg:top-24">
          <CheckoutFlow
            courseId={course.id}
            courseSlug={course.slug}
            price={course.isFree ? "0" : course.price}
            originalPrice={course.originalPrice}
            currency={course.currency}
            locale={locale}
          />
        </div>

        <div className="order-2 space-y-6 lg:order-1 lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {course.coverImageUrl ? (
              <Image
                src={course.coverImageUrl}
                alt=""
                width={640}
                height={360}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-video w-full object-cover"
              />
            ) : (
              <span className="flex aspect-video w-full items-center justify-center bg-primary/10 text-primary">
                <BookOpen aria-hidden="true" className="size-10" />
              </span>
            )}
            <div className="space-y-4 p-5">
              <div>
                <p className="text-lg font-semibold text-balance text-foreground">{course.title}</p>
                {course.subtitle && <p className="mt-1 text-sm text-pretty text-muted-foreground">{course.subtitle}</p>}
              </div>

              <div className="flex items-center gap-3">
                {course.instructorAvatarUrl ? (
                  <Image
                    src={course.instructorAvatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound aria-hidden="true" className="size-4" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{course.instructorName}</p>
                  <p className="text-xs text-muted-foreground">{t("instructorLabel")}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">
                  <SignpostBig aria-hidden="true" className="size-3" />
                  {tDifficulty(course.level)}
                </Badge>
                <Badge variant="outline">
                  <Clock aria-hidden="true" className="size-3" />
                  {t("durationHours", { hours: formatDuration(course.estimatedDurationMinutes, locale) })}
                </Badge>
                <Badge variant="outline">
                  <BookOpen aria-hidden="true" className="size-3" />
                  {t("lessonCount", { count: course.lessonCount })}
                </Badge>
                <Badge variant="outline">
                  <Languages aria-hidden="true" className="size-3" />
                  {tLanguage(course.language)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">{t("trust.title")}</p>
            <ul className="space-y-3">
              {trustItems.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-sm text-muted-foreground sm:hidden">
            <Link href={`/courses/${courseSlug}`} className="underline underline-offset-2">
              {t("backToCourse")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
