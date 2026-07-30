import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";
import { CourseService } from "@/courses/services/course.service";
import { getInitials } from "@/auth/utils/display-name";
import type { Locale } from "@/i18n/routing";

/** Paymob approval hotfix: guest-facing prices always display in EGP,
 *  regardless of a course's stored `currency` — matches `PriceBlock`'s
 *  own formatting exactly (see that component's note). */
function formatPrice(amount: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EGP" }).format(Number(amount));
}

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
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">{t("eyebrow")}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{t("title")}</h2>
          </div>
          <Link
            href="/courses"
            className="hidden shrink-0 text-sm font-semibold text-primary hover:underline sm:inline-block"
          >
            {t("viewAllLabel")}
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((course, index) => (
            <Reveal key={course.id} style={{ "--reveal-delay": `${index * 0.05}s` } as React.CSSProperties}>
              <Link href={`/courses/${course.slug}`} className="group block h-full">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  {course.coverImageUrl ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-[inherit]">
                      <Image
                        src={course.coverImageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-t-[inherit] bg-primary/5" />
                  )}
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-tint text-[10px] font-medium text-tint-foreground">
                        {getInitials(course.instructorName)}
                      </span>
                      {course.instructorName}
                    </span>
                    <span className="font-semibold text-foreground">
                      {course.isFree ? t("free") : formatPrice(course.price, locale)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>

        <Link
          href="/courses"
          className="mt-8 block text-center text-sm font-semibold text-primary hover:underline sm:hidden"
        >
          {t("viewAllLabel")}
        </Link>
      </div>
    </section>
  );
}
