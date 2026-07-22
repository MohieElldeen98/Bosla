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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteInstructorAction } from "@/courses/actions/instructor.actions";

/** Per-row menu — Edit/Delete. Both `admin`/`super_admin` may delete
 *  (`requireCourseManagementAccess` allows both), so unlike
 *  `CourseRowActions` this needs no `PermissionGuard`. */
export function InstructorRowActions({ id, name }: { id: string; name: string }) {
  const t = useTranslations("Admin.instructors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(t("confirm.delete", { title: name }))) return;
    startTransition(async () => {
      const result = await deleteInstructorAction(id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" disabled={isPending} aria-label={t("actionsFor", { name })} />}
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/instructors/${id}/edit`)}>{t("actions.edit")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          {t("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
