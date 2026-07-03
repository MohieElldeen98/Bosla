import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { InstructorProfileForm } from "@/components/instructor/profile/InstructorProfileForm";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";

/**
 * `/instructor/profile` — the Instructor Profile editor (Phase 6, Step
 * 6.6). `CourseService.getOwnInstructor` resolves (and, if this is the
 * Instructor's very first visit before ever creating a course,
 * auto-creates) the same `instructors` row `CourseService.createOwn`
 * (Step 6.3) already wires — one attribution row per Instructor, shared
 * by both entry points.
 */
export default async function InstructorProfilePage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, instructor] = await Promise.all([
    getTranslations("Instructor.profile"),
    CourseService.getOwnInstructor(user),
  ]);

  if (!instructor) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />
      <InstructorProfileForm instructor={instructor} />
    </div>
  );
}
