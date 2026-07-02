"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, LogOut, Settings, ShieldCheck, User as UserIcon } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/auth/actions/sign-out.action";
import { SessionClientService } from "@/auth/services/session-client.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { getInitials, resolveDisplayName } from "@/auth/utils/display-name";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/auth/types/profile";
import type { AuthUser } from "@/auth/types/session";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

/**
 * Replaces the anonymous Sign In / Get Started buttons in `Navbar` once a
 * session exists — the same `AuthUser`/role-checking building blocks the
 * rest of the app already uses (`isRoleAllowed`, `signOutAction`), no new
 * auth state of its own. `user`/`profile` arrive as props from `Navbar`,
 * which reads them client-side via `useSession()` (see that component's
 * own comment for why — the homepage's ISR caching).
 *
 * Rendered twice — once in the desktop nav row, once inside the mobile
 * `Sheet` — rather than needing two different implementations, since a
 * Base UI dropdown portals to `document.body` and overlays correctly
 * either way. `onNavigate`, when given, closes the mobile Sheet on
 * selection — the same callback shape `LanguageSwitcher`'s
 * `onSelectLocale` already uses in that same Sheet.
 */
export function NavbarUserMenu({
  user,
  profile,
  onNavigate,
}: {
  user: AuthUser;
  profile: Profile | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Navbar.userMenu");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const displayName = resolveDisplayName(profile, user);
  const initials = getInitials(displayName);
  const isAdmin = isRoleAllowed(user.role, [...ADMIN_ROLES]);

  function closeMenu() {
    setOpen(false);
    onNavigate?.();
  }

  function handleSignOut() {
    setOpen(false);
    startTransition(async () => {
      // `signOutAction()` alone clears the server-side session but can't
      // reach the browser's own Supabase client instance — without also
      // calling `SessionClientService.signOut()`, `useSession()`'s
      // `onAuthStateChange` subscription never fires, and the navbar
      // keeps showing the signed-in state until an unrelated reload.
      // Both are safe to call together; signing out twice is a no-op.
      await Promise.all([signOutAction(), SessionClientService.signOut()]);
      router.push("/");
      router.refresh();
      onNavigate?.();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-2 px-2" disabled={isPending} />}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials}
        </span>
        <span className="hidden max-w-32 truncate text-start text-sm font-medium text-foreground sm:block">
          {displayName}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate font-medium text-foreground">{displayName}</span>
          {user.email && displayName !== user.email && (
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" onClick={closeMenu} />}>
          <UserIcon aria-hidden="true" />
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard" onClick={closeMenu} />}>
          <LayoutDashboard aria-hidden="true" />
          {t("myDashboard")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" onClick={closeMenu} />}>
          <Settings aria-hidden="true" />
          {t("accountSettings")}
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin" onClick={closeMenu} />}>
              <ShieldCheck aria-hidden="true" />
              {t("adminPanel")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut} disabled={isPending}>
          <LogOut aria-hidden="true" />
          {isPending ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
