import { getLocale, getTranslations } from "next-intl/server";
import { Award } from "lucide-react";
import { SessionService } from "@/auth/services/session.service";
import { listMyCertificatesAction } from "@/certificates/actions/certificate.actions";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";
import { WorkspaceCertificateList } from "@/components/workspace/WorkspaceCertificateList";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** `/me/certificates` — every certificate the learner has earned, newest
 *  first. Course titles are resolved here (server-side) rather than
 *  carried on `Certificate` itself, the same "resolve at read time, not
 *  stored" convention `LegalDocumentPage`'s token substitution and
 *  `StudentDashboardService`'s course-title joins both already use. */
export default async function WorkspaceCertificatesPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Me.certificates");

  const result = await listMyCertificatesAction();
  if (!result.success) {
    return <ErrorState title={t("errorTitle")} description={result.message} />;
  }

  const certificates = result.data;
  if (certificates.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Link href="/me/courses" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {t("browseCourses")}
          </Link>
        }
      />
    );
  }

  const courses = await CourseRepository.findByIds(certificates.map((certificate) => certificate.courseId));
  const courseTitleById = new Map(courses.map((course) => [course.id, resolveLocalizedText(course.title, locale)]));

  const items = [...certificates]
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .map((certificate) => ({
      ...certificate,
      courseTitle: courseTitleById.get(certificate.courseId) ?? t("unknownCourse"),
    }));

  return <WorkspaceCertificateList certificates={items} locale={locale} />;
}
