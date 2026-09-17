"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/auth/actions/sign-out.action";
import { SessionClientService } from "@/auth/services/session-client.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { resolveDisplayName } from "@/auth/utils/display-name";
import { cn } from "@/lib/utils";
import type { Profile } from "@/auth/types/profile";
import type { AuthUser } from "@/auth/types/session";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export function NavbarUserMenu({
  user,
  profile,
  onNavigate,
  triggerClassName,
  isProfileLoading,
}: {
  user: AuthUser;
  profile: Profile | null;
  onNavigate?: () => void;
  triggerClassName?: string;
  isProfileLoading?: boolean;
}) {
  const t = useTranslations("Navbar.userMenu");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const displayName = resolveDisplayName(profile, user);
  const isAdmin = isRoleAllowed(user.role, [...ADMIN_ROLES]);
  // `resolveDisplayName` falls back to `user.email` while `profile` hasn't
  // loaded yet — fine as a permanent fallback (e.g. the profile row never
  // got created), but shown for the brief moment `profile` is still in
  // flight it read as "email, then swaps to the real name a beat later".
  // A skeleton in that window avoids showing content we know is about to
  // change.
  const showSkeleton = !!isProfileLoading;

  function closeMenu() {
    setOpen(false);
    onNavigate?.();
  }

  /**
   * Signing out used to close the menu on click and then go quiet: the
   * `signingOut` label it swaps in lives *inside* the menu that just
   * closed, the trigger showed no busy state, the action's own
   * `AuthActionResult` was discarded, and the first thing the user saw was
   * the page jumping to the homepage a beat later. A failure looked
   * identical to success — nothing happened, still signed in, no message.
   *
   * Now the menu stays open and the row shows a spinner until the sign-out
   * actually resolves, a failure says so and leaves the session alone, and
   * the redirect is confirmed by a toast so arriving on the homepage reads
   * as "that worked" rather than "why am I here".
   */
  function handleSignOut() {
    startTransition(async () => {
      // Both calls are required — signOutAction alone can't reach the
      // browser's Supabase client, so useSession()'s onAuthStateChange
      // never fires and the navbar keeps showing signed-in state. The
      // client call has no result to check (it resolves either way), so
      // the server action's is the one that decides success.
      const [result] = await Promise.all([signOutAction(), SessionClientService.signOut()]);
      if (!result.success) {
        toast.error(result.message || t("signOutError"));
        return;
      }
      setOpen(false);
      toast.success(t("signedOut"));
      router.push("/");
      router.refresh();
      onNavigate?.();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className={cn("gap-2 px-2", triggerClassName)} disabled={isPending} />}
      >
        {showSkeleton ? (
          <span className="block size-7 animate-pulse rounded-full bg-current/25" />
        ) : (
          <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl ?? null} className="size-7" />
        )}
        {showSkeleton ? (
          <span className="hidden h-3.5 w-16 animate-pulse rounded bg-current/25 sm:block" />
        ) : (
          <span className="hidden max-w-32 truncate text-start text-sm font-medium sm:block">{displayName}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-1.5 py-1">
          <span className="block truncate font-medium text-foreground">{displayName}</span>
          {user.email && displayName !== user.email && (
            <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/me" onClick={closeMenu} />}>
          <LayoutDashboard aria-hidden="true" />
          {t("myWorkspace")}
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin" onClick={closeMenu} />}>
              <ShieldCheck aria-hidden="true" />
              {t("adminDashboard")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          // `closeOnClick={false}` keeps the menu open for the round trip
          // — without it the busy row unmounts the instant it's clicked and
          // there is nothing left to show progress on.
          closeOnClick={false}
          onClick={handleSignOut}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <LogOut aria-hidden="true" />
          )}
          {isPending ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
