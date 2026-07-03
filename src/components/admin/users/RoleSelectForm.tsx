"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserRoleAction } from "@/auth/actions/user-admin.actions";
import { ROLES, type Role } from "@/auth/types/role";

/**
 * The User Details page's (Phase 7) role-change control — delegates
 * entirely to `UserRoleService.updateUserRole` via `updateUserRoleAction`
 * (the *only* place `app_metadata.role`/`profiles.role` are ever
 * written); this component has no role logic of its own, just a Select
 * + optimistic-with-rollback update, same pattern as `SectionEnableToggle`.
 * `sync_failed` (the two-system-write partially failing) gets its own
 * distinct toast copy, not folded into the generic error message.
 */
export function RoleSelectForm({ userId, role }: { userId: string; role: Role }) {
  const t = useTranslations("Admin.users");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextRole: Role | null) {
    if (!nextRole) return;
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, nextRole);
      if (result.success) {
        toast.success(t("toasts.roleUpdated"));
        router.refresh();
      } else if (result.code === "sync_failed") {
        toast.error(t("toasts.roleSyncFailed"));
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{t("fields.role")}</label>
      <Select value={role} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`role.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
