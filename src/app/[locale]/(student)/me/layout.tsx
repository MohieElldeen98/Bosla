import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { resolveDisplayName } from "@/auth/utils/display-name";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { WorkspaceTabNav } from "@/components/workspace/WorkspaceTabNav";

/**
 * `/me/*` — the Learner Workspace, one personal hub for every
 * authenticated role (student/instructor/admin all land here for their
 * own courses/profile/settings, completely separate from `/instructor`
 * and `/admin`). Guarded by the same `(student)/layout.tsx` `requireRole`
 * check every route in this group already has — no extra guard needed
 * here.
 *
 * Admins get a single "Go to Admin Dashboard" shortcut in the header,
 * visible on every tab — not merged into the workspace itself, per the
 * "admin panel stays completely separate" requirement.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [user, t] = await Promise.all([SessionService.getCurrentUser(), getTranslations("Me")]);
  if (!user) return null;

  const profile = await ProfileService.getByUserId(user.id);
  const displayName = resolveDisplayName(profile, user);
  const isAdmin = isRoleAllowed(user.role, ["admin", "super_admin"]);

  return (
    // `w-full min-w-0` — `<body>` (`app/[locale]/layout.tsx`) is a flex
    // column and this is one of its flex items; without an explicit
    // width, the flex algorithm sizes this box to fit its content's
    // max-content width (`min-w-0` alone wasn't enough here — Chrome
    // still fit-to-content on the cross axis), and the tab nav's
    // `shrink-0` tabs (deliberately unshrinkable, so labels never
    // squish; the nav's own `overflow-x-auto` handles narrow screens)
    // made that content wider than the viewport, pushing the whole page
    // into horizontal scroll instead of scrolling only within the tab
    // strip. `w-full` pins this box to the flex container's available
    // width regardless of content, so overflow is contained to the nav.
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 px-6 py-10 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={displayName}
            avatarUrl={profile?.avatarUrl ?? null}
            className="size-11 text-sm font-semibold"
            fallbackClassName="bg-primary text-primary-foreground"
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
            {t("backToSite")}
          </Button>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ShieldCheck aria-hidden="true" className="size-4" />
              {t("goToAdminDashboard")}
            </Link>
          )}
        </div>
      </div>

      <WorkspaceTabNav />

      <div>{children}</div>
    </div>
  );
}
