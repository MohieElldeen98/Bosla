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
import {
  approveInstructorApplicationAction,
  rejectInstructorApplicationAction,
} from "@/instructor/actions/instructor-application.actions";
import type { InstructorProfileListItem } from "@/instructor/types/instructor-profile-search";

/** Per-row menu for `/admin/instructors` (Phase 6, Step 6.1) — mirrors
 *  `OrderRowActions` exactly (status-flip actions, toast +
 *  `router.refresh()`). Only a `pending` application offers Approve/
 *  Reject — `InstructorApplicationService`'s own mutations re-check
 *  this regardless, this just avoids offering a guaranteed-to-fail
 *  action in the first place. */
export function InstructorApplicationRowActions({ application }: { application: InstructorProfileListItem }) {
  const t = useTranslations("Admin.instructorApplications");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveInstructorApplicationAction(application.id, application.updatedAt);
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
      const result = await rejectInstructorApplicationAction(application.id, application.updatedAt);
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

  if (application.status !== "pending") {
    return null;
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
            aria-label={t("actionsFor", { name: application.applicantName })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleApprove}>{t("actions.approve")}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleReject}>
          {t("actions.reject")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
