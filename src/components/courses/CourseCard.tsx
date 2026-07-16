import { BookOpen, Clock, GraduationCap } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseListItem } from "@/courses/types/course-search";
import type { getTranslations } from "next-intl/server";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

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

/**
 * One card in the public catalog grid (`/courses`, Step 3.4) — reuses the
 * same `Card`/`Badge` primitives and general visual language
 * `FeaturedCourses` (the homepage's mock-data section) already
 * established, adapted for real data: a real cover image when
 * `coverImageUrl` is set, a generic gradient+icon placeholder otherwise
 * (unlike `FeaturedCourses`, real specialties don't have a fixed
 * name→icon/color mapping to reuse). No client-side state — this is a
 * plain Server Component, the grid itself doesn't need interactivity.
 */
export function CourseCard({
  course,
  locale,
  t,
  tDifficulty,
  tLanguage,
}: {
  course: CourseListItem;
  locale: string;
  /** All three translators passed down from the page's own single
   *  `getTranslations` calls rather than each card calling
   *  `useTranslations` itself — this is a Server Component rendered once
   *  per row in a page of up to 48, and `next-intl`'s synchronous
   *  `useTranslations` hook only works in Client Components anyway (every
   *  other Server Component in this codebase uses `getTranslations` from
   *  `next-intl/server`, awaited once, not per leaf component). */
  t: Translator;
  tDifficulty: Translator;
  tLanguage: Translator;
}) {
  return (
    <Link href={`/courses/${course.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
        <div className="relative flex h-40 items-end overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          {course.coverImageUrl ? (
            <Image
              src={course.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <BookOpen aria-hidden="true" className="absolute -end-4 -bottom-4 size-28 text-primary/15" />
          )}
          <div className="absolute top-3 start-3 flex flex-wrap items-center gap-1.5">
            {course.featured && (
              <Badge className="border-none bg-white/90 text-foreground shadow-sm">{t("featured")}</Badge>
            )}
          </div>
          <span className="absolute top-3 end-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
            {tDifficulty(course.level)}
          </span>
        </div>

        <CardHeader className="pt-5">
          <CardTitle className="line-clamp-2 text-lg leading-snug">{course.title}</CardTitle>
          {course.subtitle && (
            <CardDescription className="line-clamp-2">{course.subtitle}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 pb-5">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {course.instructorName.charAt(0)}
            </span>
            <span className="truncate text-muted-foreground">{course.instructorName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="secondary">{course.specialtyName}</Badge>
            {course.categoryName && <Badge variant="outline">{course.categoryName}</Badge>}
            <Badge variant="outline">{tLanguage(course.language)}</Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {course.estimatedDurationMinutes !== null && (
              <span className="flex items-center gap-1">
                <Clock aria-hidden="true" className="size-4" />
                {t("durationHours", { hours: formatDuration(course.estimatedDurationMinutes, locale) })}
              </span>
            )}
            {course.certificateAvailable && (
              <span className="flex items-center gap-1">
                <GraduationCap aria-hidden="true" className="size-4" />
                {t("certificate")}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
            {course.isFree ? (
              <span className="text-lg font-semibold text-emerald-600">{t("free")}</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">
                  {formatPrice(course.price, course.currency, locale)}
                </span>
                {course.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(course.originalPrice, course.currency, locale)}
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
