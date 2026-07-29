import { getTranslations } from "next-intl/server";
import { Card, Avatar } from "@heroui/react";
import { BookOpen } from "lucide-react";
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
    <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">{t("title")}</h2>
        </div>
        <Link href="/courses" className="hidden shrink-0 text-sm font-medium text-accent hover:underline sm:inline-block">
          {t("viewAllLabel")}
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((course) => (
          <Card
            key={course.id}
            render={(props) => (
              <Link {...(props as React.ComponentPropsWithoutRef<typeof Link>)} href={`/courses/${course.slug}`} />
            )}
          >
            {course.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Card.Header has no next/image slot; matches this file's own scope (display only, no optimization pass here)
              <img src={course.coverImageUrl} alt="" className="aspect-video w-full rounded-t-[inherit] object-cover" />
            ) : (
              <span className="flex aspect-video w-full items-center justify-center bg-accent/10 text-accent">
                <BookOpen aria-hidden="true" className="size-8" />
              </span>
            )}
            <Card.Header>
              <Card.Title className="line-clamp-2">{course.title}</Card.Title>
            </Card.Header>
            <Card.Content className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Avatar className="size-6 text-[10px]">
                  <Avatar.Image src={course.instructorAvatarUrl ?? undefined} alt="" />
                  <Avatar.Fallback>{getInitials(course.instructorName)}</Avatar.Fallback>
                </Avatar>
                {course.instructorName}
              </span>
              <span className="font-semibold text-foreground">
                {course.isFree ? t("free") : formatPrice(course.price, locale)}
              </span>
            </Card.Content>
          </Card>
        ))}
      </div>
      <Link href="/courses" className="mt-8 block text-center text-sm font-medium text-accent hover:underline sm:hidden">
        {t("viewAllLabel")}
      </Link>
    </section>
  );
}
