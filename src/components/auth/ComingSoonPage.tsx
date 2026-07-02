import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { resolveDisplayName } from "@/auth/utils/display-name";
import type { AuthUser } from "@/auth/types/session";
import type { Profile } from "@/auth/types/profile";

/**
 * The shared template for `/dashboard`, `/profile`, `/settings` — three
 * intentional placeholders (no Student Dashboard, profile editing, or
 * settings functionality is in scope for the navbar/user-menu feature
 * these routes exist to make reachable). Mirrors
 * `admin/AdminPlaceholderPage.tsx`'s "Heading + Empty State" shape so a
 * future step that builds real functionality here has one page per route
 * to fill in, not a bespoke placeholder layout to first replace.
 */
export async function ComingSoonPage({
  pageKey,
  user,
  profile,
}: {
  pageKey: "myDashboard" | "profile" | "settings";
  user: AuthUser;
  profile: Profile | null;
}) {
  const t = await getTranslations("Dashboard");
  const displayName = resolveDisplayName(profile, user);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-24">
      <PageTitle title={t(`${pageKey}.title`)} description={t(`${pageKey}.description`)} />
      <EmptyState
        badge={t("comingSoonBadge")}
        title={t("comingSoonTitle")}
        description={t("comingSoonMessage")}
      />
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">{t("accountInfoTitle")}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">{t("nameLabel")}</dt>
            <dd className="truncate text-sm font-medium text-foreground">{displayName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("emailLabel")}</dt>
            <dd className="truncate text-sm font-medium text-foreground">{user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("roleLabel")}</dt>
            <dd className="text-sm font-medium text-foreground">{t(`roles.${user.role}`)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
