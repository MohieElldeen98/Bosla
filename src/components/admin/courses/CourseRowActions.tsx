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
import {
  archiveCourseAction,
  deleteCourseAction,
  restoreCourseAction,
  submitCourseForReviewAction,
  approveCourseAction,
  rejectCourseAction,
} from "@/courses/actions/course.actions";
import type { CourseListItem } from "@/courses/types/course-search";
import type { Role } from "@/auth/types/role";

/**
 * Per-row menu. Archive/Restore call `CourseService`'s status-flip
 * methods, same as before; Submit for Review/Approve/Reject (Phase 6,
 * Step 6.2) are the new course state-machine transitions, each only
 * offered when the course is in the one status it's valid from — the
 * service re-checks this regardless, this just avoids offering a
 * guaranteed-to-fail action. Delete is hard and irreversible so it's
 * gated to Super Admin both here (`PermissionGuard`, presentation) and
 * again in `CourseService.delete` (the real boundary) — see
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

  function handleSubmitForReview() {
    startTransition(async () => {
      const result = await submitCourseForReviewAction(course.id, course.updatedAt);
      if (result.success) {
        toast.success(t("toasts.submittedForReview"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await approveCourseAction(course.id, course.updatedAt);
      if (result.success) {
        toast.success(t("toasts.approved"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectCourseAction(course.id, course.updatedAt);
      if (result.success) {
        toast.success(t("toasts.rejected"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
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
        {course.status === "draft" && (
          <DropdownMenuItem onClick={handleSubmitForReview}>{t("actions.submitForReview")}</DropdownMenuItem>
        )}
        {course.status === "in_review" && (
          <>
            <DropdownMenuItem onClick={handleApprove}>{t("actions.approve")}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleReject}>
              {t("actions.reject")}
            </DropdownMenuItem>
          </>
        )}
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
