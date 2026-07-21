import { getTranslations } from "next-intl/server";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { SessionService } from "@/auth/services/session.service";
import { CompassBezel } from "@/components/brand/CompassBezel";
import { CourseEditorForm } from "@/components/admin/courses/CourseEditorForm";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import {
  createCourseAction,
  createOwnCourseAction,
  updateCourseAction,
  updateOwnCourseAction,
} from "@/courses/actions/course.actions";
import type { Locale } from "@/i18n/routing";
import type { ResolvedInstructor } from "@/courses/types/instructor";

/** Session-gated: without this, the build statically prerenders the page
 *  with no session and bakes the sign-in redirect in for everyone. */
export const dynamic = "force-dynamic";

/**
 * `/courses/new` — the author-facing Create Course page under the public
 * chrome (navbar/footer), the exact `/blog/new` pattern: an Instructor
 * never needs a dashboard shell just to start a course. Same shared
 * `CourseEditorForm` as the admin/instructor workspaces with the owner
 * actions (`createOwnCourseAction` forces `instructorId`/`status`
 * server-side) and the manager-only surfaces hidden. Cancel returns to
 * the catalog; a created course continues to `/courses/[slug]/edit` — the
 * on-site course workspace, where the Curriculum tab leads to building
 * lessons and videos. No panel involved, for any role.
 */
export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }
  if (!isRoleAllowed(user!.role, ["instructor", "admin", "super_admin"])) {
    redirect({ href: "/courses", locale });
  }

  const [t, tCatalog, specialties, categories, ownInstructor] = await Promise.all([
    getTranslations({ locale, namespace: "Instructor.courseEditor" }),
    getTranslations({ locale, namespace: "CourseCatalog" }),
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
    CourseService.getOwnInstructor(user!),
  ]);

  if (!ownInstructor) {
    redirect({ href: "/courses", locale });
  }

  const resolvedOwnInstructor = await CourseInstructorService.getResolvedById(
    ownInstructor!.id,
    locale as Locale,
  );
  const instructors: ResolvedInstructor[] = resolvedOwnInstructor ? [resolvedOwnInstructor] : [];

  // The owner actions hard-require the Instructor role; an Admin creating
  // from this page goes through the management actions instead (their own
  // instructor row still pre-fills `instructorId`, and status starts as
  // the schema's "draft" default either way).
  const isInstructor = user!.role === "instructor";
  const createAction = isInstructor ? createOwnCourseAction : createCourseAction;
  const updateAction = isInstructor ? updateOwnCourseAction : updateCourseAction;

  return (
    <div>
      {/* Header band — the catalog hero's own language (muted band, bezel
          motif, navbar clearance), so authoring feels like a room inside
          the same building, not a different app. */}
      <section className="relative overflow-hidden border-b border-border bg-muted/40">
        <CompassBezel className="pointer-events-none absolute -end-24 -top-16 size-80 text-primary/[0.07]" />
        <div className="relative mx-auto max-w-4xl px-6 pt-32 pb-10 lg:px-8">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            {tCatalog("backToCourses")}
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GraduationCap aria-hidden="true" className="size-6" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{t("createTitle")}</h1>
              <p className="mt-1 text-muted-foreground">{t("createDescription")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        <CourseEditorForm
          mode="create"
          course={null}
          seo={null}
          specialties={specialties}
          categories={categories}
          instructors={instructors}
          createAction={createAction}
          updateAction={updateAction}
          listHref="/courses"
          editHrefTemplate="/courses/{slug}/edit"
          showInstructorField={false}
          showStatusField={false}
          showSeoSection={false}
        />
      </div>
    </div>
  );
}
