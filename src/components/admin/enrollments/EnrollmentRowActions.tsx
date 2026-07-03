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
import { revokeEnrollmentAction, restoreEnrollmentAction } from "@/learning/actions/enrollment.actions";
import type { EnrollmentListItem } from "@/learning/types/enrollment-search";

/**
 * Per-row menu (Step 4.2). Revoke/Restore are the same optimistic-
 * concurrency-aware `status` flip `EnrollmentService.revoke`/`.restore`
 * already implement — this passes the row's currently-known `updatedAt`
 * as `expectedUpdatedAt`, so a `"conflict"` result (someone else changed
 * this enrollment since the page loaded) surfaces as its own message
 * rather than a generic failure, matching the Course Editor's (Step 3.3)
 * conflict-handling convention. No `PermissionGuard` here — unlike
 * Course's hard Delete, Revoke/Restore aren't Super-Admin-only (any
 * Admin may manage enrollments per this step's authorization scope); the
 * real boundary is `(admin)/layout.tsx` (route) and
 * `requireCourseManagementAccess` (service), both already Admin/Super
 * Admin only.
 */
export function EnrollmentRowActions({ enrollment }: { enrollment: EnrollmentListItem }) {
  const t = useTranslations("Admin.enrollments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeEnrollmentAction(enrollment.id, enrollment.updatedAt);
      if (result.success) {
        toast.success(t("toasts.revoked"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreEnrollmentAction(enrollment.id, enrollment.updatedAt);
      if (result.success) {
        toast.success(t("toasts.restored"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
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
            aria-label={t("actionsFor", { name: enrollment.studentName })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/enrollments/${enrollment.id}`)}>
          {t("actions.view")}
        </DropdownMenuItem>
        {enrollment.status === "revoked" ? (
          <DropdownMenuItem onClick={handleRestore}>{t("actions.restore")}</DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={handleRevoke}>
            {t("actions.revoke")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
