import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Clock3, ListTree, PartyPopper } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { SessionService } from "@/auth/services/session.service";
import { EmptyState } from "@/components/admin/EmptyState";
import { CourseEditorForm } from "@/components/admin/courses/CourseEditorForm";
import { CourseAuthoringHeader } from "@/components/courses/authoring/CourseAuthoringHeader";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import {
  createCourseAction,
  createOwnCourseAction,
  updateCourseAction,
  updateOwnCourseAction,
} from "@/courses/actions/course.actions";
import type { Locale } from "@/i18n/routing";
import type { ResolvedInstructor } from "@/courses/types/instructor";

/** Session-gated, so never statically prerendered — same as `/courses/new`. */
export const dynamic = "force-dynamic";

/**
 * `/courses/[slug]/edit` — the on-site Edit Course page (public chrome),
 * the sibling of `/courses/new`. Authoring lives on the normal site, not
 * a panel: a course's own instructor edits their draft here, and a manager
 * (Admin/Super Admin) edits any course in any status.
 * `requireOwnCourseAccess` is the one gate — it already encodes "own
 * course, or manager of any." Instructors still can't edit a non-`draft`
 * course (the review freeze), so they see a notice instead of the form;
 * `CourseService.updateOwn` re-checks that server-side regardless.
 */
export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { slug, locale } = await params;
  const { created } = await searchParams;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  const bySlug = await CourseService.getBySlug(slug);
  if (!bySlug) notFound();

  const access = await requireOwnCourseAccess(user!, bySlug.id);
  if (!access.ok) {
    redirect({ href: `/courses/${slug}`, locale });
    return null;
  }
  const course = access.course;
  const isManager = isRoleAllowed(user!.role, ["admin", "super_admin"]);
  const canEdit = isManager || course.status === "draft";

  const t = await getTranslations({ locale, namespace: "Instructor.courseEditor" });
  const courseTitle = resolveLocalizedText(course.title, locale as Locale);

  if (!canEdit) {
    return (
      <div>
        <CourseAuthoringHeader slug={slug} courseTitle={courseTitle} locale={locale} />
        <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
          <EmptyState
            icon={Clock3}
            title={t("notEditableTitle")}
            description={t(`notEditableDescription.${course.status}`)}
          />
        </div>
      </div>
    );
  }

  const [specialties, categories, resolvedInstructor] = await Promise.all([
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
    CourseInstructorService.getResolvedById(course.instructorId, locale as Locale),
  ]);
  const instructors: ResolvedInstructor[] = resolvedInstructor ? [resolvedInstructor] : [];

  const createAction = isManager ? createCourseAction : createOwnCourseAction;
  const updateAction = isManager ? updateCourseAction : updateOwnCourseAction;

  return (
    <div>
      <CourseAuthoringHeader slug={slug} courseTitle={courseTitle} locale={locale} />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-10 lg:px-8">
        {created === "1" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-start">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PartyPopper aria-hidden="true" className="size-4.5" />
            </span>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t("createdNextSteps.title")}</p>
              <p className="text-sm text-muted-foreground">{t("createdNextSteps.description")}</p>
              <Link
                href={`/courses/${slug}/curriculum`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ListTree aria-hidden="true" className="size-3.5" />
                {t("createdNextSteps.addCurriculum")}
              </Link>
            </div>
          </div>
        )}
        <CourseEditorForm
          mode="edit"
          course={course}
          seo={null}
          specialties={specialties}
          categories={categories}
          instructors={instructors}
          createAction={createAction}
          updateAction={updateAction}
          listHref={`/courses/${slug}`}
          showInstructorField={false}
          showStatusField={false}
          showSeoSection={false}
        />
      </div>
    </div>
  );
}
