"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/auth/actions/sign-out.action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/auth/types/session";

/** Mirrors `components/admin/UserMenu.tsx` exactly — its own copy since
 *  the role label/translation namespace differ (an Instructor has one
 *  fixed role label, not admin/super_admin). Before this, an Instructor
 *  had no sign-out control anywhere in `(instructor)/*` at all. */
export function InstructorUserMenu({ user }: { user: AuthUser }) {
  const t = useTranslations("Instructor.shell.userMenu");
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2 px-2" disabled={isPending} />}>
        <span className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <UserIcon aria-hidden="true" className="size-4" />
        </span>
        <span className="hidden text-start sm:block">
          <span className="block max-w-40 truncate text-sm font-medium text-foreground">
            {user.email ?? t("role")}
          </span>
          <span className="block text-xs text-muted-foreground">{t("role")}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-xs font-normal text-muted-foreground">{t("signedInAs")}</span>
          <span className="block truncate font-medium text-foreground">{user.email ?? t("role")}</span>
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
