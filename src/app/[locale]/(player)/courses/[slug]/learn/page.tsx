import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { requireAuth } from "@/auth/guards/require-auth";
import { redirect, Link } from "@/i18n/navigation";
import { getResumeLessonIdAction } from "@/learning/actions/course-player.actions";
import { EmptyState } from "@/components/admin/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * `/courses/[slug]/learn` — the Course Player's (Step 4.4) smart "resume"
 * entry point, replacing Step 4.3's placeholder. Never renders a player
 * itself: it always either redirects to the correct lesson
 * (`/courses/[slug]/learn/[lessonId]`, the most recently touched one, or
 * the first lesson if the student has never opened anything in this
 * course) or, for a course with no lessons authored yet, shows an empty
 * state. Auth + enrollment are enforced by `getResumeLessonIdAction` →
 * `CoursePlayerService` (not_found for a missing course, forbidden for
 * signed-in-but-not-actively-enrolled — which also covers a revoked
 * enrollment, since `EnrollmentService.isEnrolled` only returns `true`
 * for `status: "active"`), same as this route always has.
 */
export default async function CourseLearnResumePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  await requireAuth(locale as Locale);

  const result = await getResumeLessonIdAction(slug);

  if (!result.success) {
    if (result.code === "not_found") {
      notFound();
    }
    return redirect({ href: `/courses/${slug}`, locale: locale as Locale });
  }

  if (result.data === null) {
    const t = await getTranslations("CoursePlayer.resume");
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          icon={BookOpen}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href={`/courses/${slug}`} className={cn(buttonVariants())}>
              {t("backToCourse")}
            </Link>
          }
        />
      </div>
    );
  }

  return redirect({ href: `/courses/${slug}/learn/${result.data.lessonId}`, locale: locale as Locale });
}
