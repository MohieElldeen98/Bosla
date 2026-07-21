import { getTranslations } from "next-intl/server";
import { SessionService } from "@/auth/services/session.service";
import { NotificationService } from "@/notifications/services/notification.service";
import { PageTitle } from "@/components/admin/PageTitle";
import { WorkspaceEmailSection } from "@/components/workspace/WorkspaceEmailSection";
import { WorkspacePasswordSection } from "@/components/workspace/WorkspacePasswordSection";
import { WorkspaceLanguageSection } from "@/components/workspace/WorkspaceLanguageSection";
import { WorkspaceNotificationPreferencesSection } from "@/components/workspace/WorkspaceNotificationPreferencesSection";
import { WorkspaceDeleteAccountSection } from "@/components/workspace/WorkspaceDeleteAccountSection";

/** `/me/settings` — account-level preferences only (email, password,
 *  language, notification preferences, delete account). Never mixes in
 *  personal-info fields — those live in `/me/profile`. */
export default async function WorkspaceSettingsPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, preferences] = await Promise.all([
    getTranslations("Me.settings"),
    NotificationService.getPreferences(user),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <WorkspaceEmailSection currentEmail={user.email ?? ""} />
      <WorkspacePasswordSection />
      <WorkspaceLanguageSection />
      <WorkspaceNotificationPreferencesSection
        initial={{
          learningUpdates: preferences.learningUpdates,
          ordersAndPayments: preferences.ordersAndPayments,
          courseAndInstructorUpdates: preferences.courseAndInstructorUpdates,
        }}
      />
      <WorkspaceDeleteAccountSection />
    </div>
  );
}
