import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/auth/guards/require-auth";
import { redirect } from "@/i18n/navigation";
import { getLessonPlayerDataAction, recordLessonOpenedAction } from "@/learning/actions/course-player.actions";
import { toLearningCurriculumTree } from "@/learning/utils/to-curriculum-tree";
import { CurriculumTree } from "@/components/courses/CurriculumTree";
import { LessonContentArea } from "@/components/player/LessonContentArea";
import { PlayerShell } from "@/components/player/PlayerShell";
import type { Locale } from "@/i18n/routing";

/**
 * `/courses/[slug]/learn/[lessonId]` — the Course Player, inside the
 * `(player)` group's chrome-free shell. `getLessonPlayerDataAction`
 * re-enforces auth + active enrollment on every render (no client-side
 * cache to go stale or be bypassed by a direct URL), and additionally
 * resolves to `not_found` when `lessonId` doesn't belong to this course's
 * own modules — a foreign or fabricated id typed into the URL can't peek
 * at another course's content. Recording "opened" (last-activity) is a
 * deliberate, separate step from the read, mirroring
 * `ProfileService.recordLogin`'s explicit-side-effect convention rather
 * than hiding a write inside a getter.
 *
 * The sidebar is the ONE CurriculumTree in learning mode
 * (docs/courses-ux-spec.md §1 rule 3), adapted from the player payload by
 * `toLearningCurriculumTree` — no parallel tree component.
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
  const t = await getTranslations({ locale, namespace: "CoursePlayer" });
  const tree = toLearningCurriculumTree(data.modules, data.currentLesson.id);

  return (
    <PlayerShell
      exitHref={`/courses/${data.courseSlug}`}
      courseTitle={data.courseTitle}
      completedLessons={data.completedLessons}
      totalLessons={data.totalLessons}
      labels={{
        exit: t("shell.exit"),
        lessons: t("shell.lessons"),
        curriculum: t("sidebar.title"),
      }}
      sidebar={<CurriculumTree tree={tree} mode="learning" courseSlug={data.courseSlug} />}
    >
      <LessonContentArea
        courseSlug={data.courseSlug}
        studentId={user.id}
        studentEmail={user.email}
        lesson={data.currentLesson}
        previousLesson={data.previousLesson}
        nextLesson={data.nextLesson}
        courseTitle={data.courseTitle}
        specialtyId={data.specialtyId}
        certificateAvailable={data.certificateAvailable}
        totalLessons={data.totalLessons}
      />
    </PlayerShell>
  );
}
