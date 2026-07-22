"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/auth/actions/sign-out.action";
import { resolveDisplayName } from "@/auth/utils/display-name";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/auth/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/auth/types/session";
import type { Profile } from "@/auth/types/profile";

export function UserMenu({ user, profile }: { user: AuthUser; profile: Profile | null }) {
  const t = useTranslations("Admin.userMenu");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSignOut() {
    setOpen(false);
    startTransition(async () => {
      await signOutAction();
      router.push("/sign-in");
      router.refresh();
    });
  }

  const roleLabel = user.role === "super_admin" ? t("role.super_admin") : t("role.admin");
  const displayName = resolveDisplayName(profile, user);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 px-2" disabled={isPending} />
        }
      >
        <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl ?? null} className="size-7" />
        <span className="hidden text-start sm:block">
          <span className="block max-w-40 truncate text-sm font-medium text-foreground">{displayName}</span>
          <span className="block text-xs text-muted-foreground">{roleLabel}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-xs font-normal text-muted-foreground">
            {t("signedInAs")}
          </span>
          <span className="block truncate font-medium text-foreground">{displayName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut} disabled={isPending}>
          <LogOut aria-hidden="true" />
          {isPending ? t("signingOut") : t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
