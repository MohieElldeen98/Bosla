import { getTranslations } from "next-intl/server";
import { RoleSelectForm } from "@/components/admin/users/RoleSelectForm";
import { AccountStatusActions } from "@/components/admin/users/AccountStatusActions";
import type { Profile } from "@/auth/types/profile";

/**
 * The User Details page's (Phase 7) Profile tab — read-only profile
 * fields plus the two admin controls (`RoleSelectForm`/
 * `AccountStatusActions`) that make this page the permanent
 * administrative view of a user, not just a viewer.
 */
export async function ProfileTab({ profile }: { profile: Profile }) {
  const t = await getTranslations("Admin.users");

  const fields: { label: string; value: string | null }[] = [
    { label: t("fields.fullName"), value: profile.fullName },
    { label: t("fields.displayName"), value: profile.displayName },
    { label: t("fields.profession"), value: profile.profession },
    { label: t("fields.country"), value: profile.country },
    { label: t("fields.language"), value: profile.language },
    { label: t("fields.website"), value: profile.website },
    { label: t("fields.linkedin"), value: profile.linkedin },
    {
      label: t("fields.yearsOfExperience"),
      value: profile.yearsOfExperience !== null ? String(profile.yearsOfExperience) : null,
    },
    { label: t("fields.specialties"), value: profile.specialties.length > 0 ? profile.specialties.join(", ") : null },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">{t("sections.profileInformation")}</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {fields.map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{field.label}</dt>
              <dd className="text-end font-medium text-foreground">{field.value ?? "—"}</dd>
            </div>
          ))}
          {profile.bio && (
            <div className="border-t border-border pt-3">
              <dt className="text-muted-foreground">{t("fields.bio")}</dt>
              <dd className="mt-1 font-medium text-foreground">{profile.bio}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">{t("sections.administration")}</h2>
        <div className="mt-4 space-y-6">
          <RoleSelectForm userId={profile.userId} role={profile.role} />
          <AccountStatusActions userId={profile.userId} status={profile.status} />
        </div>
      </div>
    </div>
  );
}
