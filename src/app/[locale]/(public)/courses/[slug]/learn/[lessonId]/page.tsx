import { notFound } from "next/navigation";
import { requireAuth } from "@/auth/guards/require-auth";
import { redirect } from "@/i18n/navigation";
import { getLessonPlayerDataAction, recordLessonOpenedAction } from "@/learning/actions/course-player.actions";
import { ModulesSidebar } from "@/components/player/ModulesSidebar";
import { LessonContentArea } from "@/components/player/LessonContentArea";
import type { Locale } from "@/i18n/routing";

/**
 * `/courses/[slug]/learn/[lessonId]` — the real Course Player (Step 4.4).
 * `getLessonPlayerDataAction` re-enforces auth + active enrollment on
 * every render (no client-side cache to go stale or be bypassed by a
 * direct URL), and additionally resolves to `not_found` when `lessonId`
 * doesn't belong to this course's own modules — a foreign or fabricated
 * id typed into the URL can't peek at another course's content. Recording
 * "opened" (last-activity) is a deliberate, separate step from the read,
 * mirroring `ProfileService.recordLogin`'s explicit-side-effect
 * convention rather than hiding a write inside a getter.
 */
export default async function CourseLessonPlayerPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string; locale: string }>;
}) {
  const { slug, lessonId, locale } = await params;
  const user = await requireAuth(locale as Locale);

  const result = await getLessonPlayerDataAction(slug, lessonId, locale as Locale);

  if (!result.success) {
    if (result.code === "not_found") {
      notFound();
    }
    return redirect({ href: `/courses/${slug}`, locale: locale as Locale });
  }

  await recordLessonOpenedAction(lessonId);

  const { data } = result;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 lg:grid-cols-[280px_1fr] lg:px-8">
      <ModulesSidebar
        courseSlug={data.courseSlug}
        courseTitle={data.courseTitle}
        modules={data.modules}
        currentLessonId={data.currentLesson.id}
        totalLessons={data.totalLessons}
        completedLessons={data.completedLessons}
        progressPercentage={data.progressPercentage}
      />
      <LessonContentArea
        courseSlug={data.courseSlug}
        studentId={user.id}
        studentEmail={user.email}
        lesson={data.currentLesson}
        previousLesson={data.previousLesson}
        nextLesson={data.nextLesson}
      />
    </div>
  );
}
