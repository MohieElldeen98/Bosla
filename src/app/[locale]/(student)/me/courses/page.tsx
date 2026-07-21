import { getLocale, getTranslations } from "next-intl/server";
import { SessionService } from "@/auth/services/session.service";
import { getMyDashboardAction } from "@/learning/actions/student-dashboard.actions";
import { ErrorState } from "@/components/admin/ErrorState";
import { MyCoursesSection } from "@/components/dashboard/MyCoursesSection";
import type { Locale } from "@/i18n/routing";

/** `/me/courses` — every active enrollment, grouped In Progress/
 *  Completed via `MyCoursesSection`'s existing `DashboardCoursesFilter`
 *  chips (relocated from `/dashboard` as-is — the grouping already
 *  existed, this tab is purely an IA move). */
export default async function WorkspaceCoursesPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = await getTranslations("Me.courses");

  const result = await getMyDashboardAction(locale as Locale);
  if (!result.success) {
    return <ErrorState title={t("errorTitle")} description={result.message} />;
  }

  return <MyCoursesSection courses={result.data.courses} />;
}
