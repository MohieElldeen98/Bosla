"use client";

import { useState, useTransition } from "react";
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
import { PermissionGuard } from "@/components/admin/PermissionGuard";
import { archiveCourseAction, deleteCourseAction, restoreCourseAction } from "@/courses/actions/course.actions";
import type { CourseListItem } from "@/courses/types/course-search";
import type { Role } from "@/auth/types/role";

/**
 * Per-row menu. Archive/Restore call the same `CourseService.update`
 * path as everything else (status flip), Delete is hard and irreversible
 * so it's gated to Super Admin both here (`PermissionGuard`, presentation)
 * and again in `CourseService.delete` (the real boundary) — see
 * docs/roles-and-permissions.md §3's precedent for sensitive admin actions.
 * No shared Dialog/AlertDialog primitive exists in this codebase yet, so
 * destructive actions confirm via `window.confirm`, matching the Session
 * Navigation feature's own finding.
 */
export function CourseRowActions({
  course,
  userRole,
}: {
  course: CourseListItem;
  userRole: Role;
}) {
  const t = useTranslations("Admin.courses");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveCourseAction(course.id);
      if (result.success) {
        toast.success(t("toasts.archived"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreCourseAction(course.id);
      if (result.success) {
        toast.success(t("toasts.restored"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(t("confirm.delete", { title: course.title }))) return;
    startTransition(async () => {
      const result = await deleteCourseAction(course.id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label={t("actionsFor", { title: course.title })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
        >
          {t("actions.edit")}
        </DropdownMenuItem>
        {course.status === "archived" ? (
          <DropdownMenuItem onClick={handleRestore}>{t("actions.restore")}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleArchive}>{t("actions.archive")}</DropdownMenuItem>
        )}
        <PermissionGuard userRole={userRole} allowedRoles={["super_admin"]}>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            {t("actions.delete")}
          </DropdownMenuItem>
        </PermissionGuard>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
