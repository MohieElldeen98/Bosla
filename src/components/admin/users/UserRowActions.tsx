"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setAccountStatusAction } from "@/auth/actions/user-admin.actions";
import type { Profile } from "@/auth/types/profile";

/**
 * Per-row menu for the admin Users listing (Phase 7) — mirrors
 * `EnrollmentRowActions` exactly (View + a status-flip action, toast +
 * `router.refresh()`). Only Activate/Suspend live here; Role change
 * needs an explicit select control, not a one-click menu item, so it
 * only lives on the User Details page's Profile tab.
 */
export function UserRowActions({ user }: { user: Pick<Profile, "userId" | "displayName" | "fullName" | "email" | "status"> }) {
  const t = useTranslations("Admin.users");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const name = user.displayName ?? user.fullName ?? user.email;

  function handleSetStatus(status: "active" | "suspended") {
    startTransition(async () => {
      const result = await setAccountStatusAction(user.userId, status);
      if (result.success) {
        toast.success(status === "suspended" ? t("toasts.suspended") : t("toasts.activated"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label={t("actionsFor", { name })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.userId}`)}>
          {t("actions.view")}
        </DropdownMenuItem>
        {user.status === "suspended" ? (
          <DropdownMenuItem onClick={() => handleSetStatus("active")}>{t("actions.activate")}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={() => handleSetStatus("suspended")}>
            {t("actions.suspend")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
