import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { SessionService } from "@/auth/services/session.service";
import { redirect, Link } from "@/i18n/navigation";
import { CourseService } from "@/courses/services/course.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { PageTitle } from "@/components/admin/PageTitle";
import type { Locale } from "@/i18n/routing";

/**
 * `/checkout/[courseSlug]` — the real Checkout flow (Step 5.1), under
 * the same `(student)` route group `/dashboard` uses (any authenticated
 * role may enter — exactly who's allowed to purchase per
 * docs/roles-and-permissions.md §2). Course-availability validation and
 * the actual duplicate-purchase guard both live in
 * `OrderService.createFromCheckout` (the real enforcement); the redirect
 * here for an already-enrolled student is just a better UX than letting
 * them submit and get a rejection.
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

  const t = await getTranslations("Checkout");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={course.title} />

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        {course.coverImageUrl ? (
          <Image
            src={course.coverImageUrl}
            alt=""
            width={64}
            height={64}
            sizes="64px"
            className="size-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen aria-hidden="true" className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{course.title}</p>
          <p className="truncate text-sm text-muted-foreground">{course.instructorName}</p>
        </div>
      </div>

      <CheckoutFlow
        courseId={course.id}
        courseSlug={course.slug}
        courseTitle={course.title}
        price={course.isFree ? "0" : course.price}
        currency={course.currency}
        locale={locale}
      />

      <p className="text-center text-sm text-muted-foreground">
        <Link href={`/courses/${courseSlug}`} className="underline underline-offset-2">
          {t("backToCourse")}
        </Link>
      </p>
    </div>
  );
}
