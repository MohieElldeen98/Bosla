import { getLocale, getTranslations } from "next-intl/server";
import { Receipt } from "lucide-react";
import { SessionService } from "@/auth/services/session.service";
import { getMyDashboardAction } from "@/learning/actions/student-dashboard.actions";
import { PageTitle } from "@/components/admin/PageTitle";
import { ErrorState } from "@/components/admin/ErrorState";
import { ContinueLearningSection } from "@/components/dashboard/ContinueLearningSection";
import { MyCoursesSection } from "@/components/dashboard/MyCoursesSection";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * `/dashboard` — the real Student Dashboard (Step 4.3), replacing the
 * `ComingSoonPage` placeholder. Reachable by any authenticated role via
 * `(student)/layout.tsx`'s guard (`requireRole`, already run before this
 * renders); the data itself is additionally scoped to the signed-in
 * user's own id inside `getMyDashboardAction`/`StudentDashboardService`
 * — there is no route param for "whose dashboard," so there's no
 * user-controlled input that could ever request someone else's.
 *
 * Only "Continue Learning" + "My Courses" — Course Player, lesson
 * viewer, module navigation, and quiz UI are explicitly out of scope for
 * this step (roadmap.md Phase 4 Step 4.3/4.4).
 */
export default async function DashboardPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = await getTranslations("Dashboard.myDashboard");

  const result = await getMyDashboardAction(locale as Locale);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
        <PageTitle title={t("title")} description={t("description")} />
        <div className="mt-8">
          <ErrorState title={t("errorTitle")} description={result.message} />
        </div>
      </div>
    );
  }

  const { courses, continueLearning } = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12 lg:px-8">
      <PageTitle
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/dashboard/orders" className={cn(buttonVariants({ variant: "outline" }))}>
            <Receipt aria-hidden="true" />
            {t("ordersAndBilling")}
          </Link>
        }
      />
      <ContinueLearningSection courses={continueLearning} />
      <MyCoursesSection courses={courses} />
    </div>
  );
}
