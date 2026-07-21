import { getTranslations } from "next-intl/server";
import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import { PageTitle } from "@/components/admin/PageTitle";
import { WorkspaceProfileForm } from "@/components/workspace/WorkspaceProfileForm";

/** `/me/profile` — personal information only (avatar/name/bio/
 *  profession/country/social links). Account-level concerns live in
 *  `/me/settings` instead. */
export default async function WorkspaceProfilePage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, profile] = await Promise.all([getTranslations("Me.profile"), ProfileService.getByUserId(user.id)]);
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <WorkspaceProfileForm profile={profile} />
    </div>
  );
}
