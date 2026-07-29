"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, Popover, Button } from "@heroui/react";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/auth/actions/sign-out.action";
import { SessionClientService } from "@/auth/services/session-client.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { getInitials, resolveDisplayName } from "@/auth/utils/display-name";
import type { Profile } from "@/auth/types/profile";
import type { AuthUser } from "@/auth/types/session";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

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
  const isAdmin = isRoleAllowed(user.role, [...ADMIN_ROLES]);

  function closeMenu() {
    setOpen(false);
    onNavigate?.();
  }

  function handleSignOut() {
    setOpen(false);
    startTransition(async () => {
      // Both calls are required — signOutAction alone can't reach the
      // browser's Supabase client, so useSession()'s onAuthStateChange
      // never fires and the navbar keeps showing signed-in state.
      await Promise.all([signOutAction(), SessionClientService.signOut()]);
      router.push("/");
      router.refresh();
      onNavigate?.();
    });
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" className="gap-2 px-2" isDisabled={isPending}>
        <Avatar className="size-7 text-xs font-semibold">
          <Avatar.Image src={profile?.avatarUrl ?? undefined} alt="" />
          <Avatar.Fallback>{getInitials(displayName)}</Avatar.Fallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-start text-sm font-medium text-foreground sm:block">
          {displayName}
        </span>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="w-56 p-1">
          <div className="px-3 py-2">
            <span className="block truncate font-medium text-foreground">{displayName}</span>
            {user.email && displayName !== user.email && (
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/me"
            onClick={closeMenu}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />
            {t("myWorkspace")}
          </Link>
          {isAdmin && (
            <>
              <div className="my-1 h-px bg-border" />
              <Link
                href="/admin"
                onClick={closeMenu}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <ShieldCheck aria-hidden="true" className="size-4" />
                {t("adminDashboard")}
              </Link>
            </>
          )}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {isPending ? t("signingOut") : t("signOut")}
          </button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
