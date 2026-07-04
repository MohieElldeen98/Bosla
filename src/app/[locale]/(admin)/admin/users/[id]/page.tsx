import { getTranslations } from "next-intl/server";
import { requireRole } from "@/auth/guards/require-role";
import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import { UserAdminService } from "@/auth/services/user-admin.service";
import { StudentDashboardService } from "@/learning/services/student-dashboard.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { CourseService } from "@/courses/services/course.service";
import { OrderService } from "@/commerce/services/order.service";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/admin/users/UserAvatar";
import { ProfileTab } from "@/components/admin/users/ProfileTab";
import { EnrollmentsTab } from "@/components/admin/users/EnrollmentsTab";
import { LearningTab } from "@/components/admin/users/LearningTab";
import { QuizAttemptsTab } from "@/components/admin/users/QuizAttemptsTab";
import { OrdersTab } from "@/components/admin/users/OrdersTab";
import { ActivityTab } from "@/components/admin/users/ActivityTab";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/users/[id]` — the permanent administrative view of a user
 * (Phase 7). Super-Admin-only, same as the listing. Every tab reuses an
 * existing domain service (`StudentDashboardService`, `EnrollmentService`,
 * `QuizAttemptService` via `UserAdminService`) rather than recomputing
 * anything — this page is a *composition* of already-correct data, not a
 * new source of truth for any of it except the Profile/Role/Status
 * fields it owns directly. All tab data is fetched here, in parallel,
 * and handed down as plain props — the same "page does the `Promise.all`,
 * children are presentational" split every other admin page in this
 * codebase uses; `TabsPanel`s just show/hide already-rendered content,
 * they don't lazy-fetch per tab.
 */
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);

  const profile = await ProfileService.getByUserId(id);

  if (!profile) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const [t, provider, enrollmentsResult, dashboard, quizAttemptsResult, activityResult, courseResult, ordersResult] =
    await Promise.all([
      getTranslations("Admin.users"),
      ProfileService.getAuthProvider(id),
      EnrollmentService.searchResolved({ studentId: id, pageSize: 50 }, locale as Locale),
      StudentDashboardService.getDashboard(actingUser, id, locale as Locale),
      UserAdminService.getQuizAttemptsSummary(actingUser, id, locale as Locale),
      UserAdminService.getActivityFeed(actingUser, id, locale as Locale),
      CourseService.searchResolved({ pageSize: 100 }, locale as Locale),
      OrderService.listForStudent(actingUser, id, locale as Locale),
    ]);

  const name = profile.displayName ?? profile.fullName ?? profile.email;
  const courseOptions = courseResult.items.map((course) => ({ value: course.id, label: course.title }));
  const learningCourses = dashboard.success ? dashboard.data.courses : [];
  const quizAttempts = quizAttemptsResult.success ? quizAttemptsResult.data : [];
  const activityEntries = activityResult.success ? activityResult.data : [];
  const orders = ordersResult.success ? ordersResult.data : [];

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: name }]} />
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar name={name} email={profile.email} avatarUrl={profile.avatarUrl} className="size-14 text-base" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{name}</h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(`role.${profile.role}`)}</Badge>
              <StatusBadge status={profile.status}>{t(`status.${profile.status}`)}</StatusBadge>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-end">
          <div>
            <dt className="text-muted-foreground">{t("fields.joined")}</dt>
            <dd className="font-medium text-foreground">
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(profile.createdAt))}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("fields.provider")}</dt>
            <dd className="font-medium text-foreground capitalize">{provider ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTab value="profile">{t("tabs.profile")}</TabsTab>
          <TabsTab value="enrollments">{t("tabs.enrollments")}</TabsTab>
          <TabsTab value="learning">{t("tabs.learning")}</TabsTab>
          <TabsTab value="quizAttempts">{t("tabs.quizAttempts")}</TabsTab>
          <TabsTab value="orders">{t("tabs.orders")}</TabsTab>
          <TabsTab value="activity">{t("tabs.activity")}</TabsTab>
        </TabsList>

        <TabsPanel value="profile">
          <ProfileTab profile={profile} />
        </TabsPanel>
        <TabsPanel value="enrollments">
          <EnrollmentsTab
            studentId={id}
            enrollments={enrollmentsResult.items}
            locale={locale}
            courseOptions={courseOptions}
          />
        </TabsPanel>
        <TabsPanel value="learning">
          <LearningTab courses={learningCourses} locale={locale} />
        </TabsPanel>
        <TabsPanel value="quizAttempts">
          <QuizAttemptsTab attempts={quizAttempts} locale={locale} />
        </TabsPanel>
        <TabsPanel value="orders">
          <OrdersTab orders={orders} locale={locale} />
        </TabsPanel>
        <TabsPanel value="activity">
          <ActivityTab entries={activityEntries} locale={locale} />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
