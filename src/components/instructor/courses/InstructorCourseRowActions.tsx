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
import { submitCourseForReviewAction } from "@/courses/actions/course.actions";
import type { CourseListItem } from "@/courses/types/course-search";

/** Per-row menu for "My Courses" (`/instructor/courses`, Phase 6, Steps
 *  6.3–6.4) — a deliberately small action set compared to
 *  `CourseRowActions` (the Admin one). Curriculum is always offered (an
 *  Instructor can review what they built at any status); Edit and
 *  Submit for Review only for a `draft` course
 *  (docs/roles-and-permissions.md §2 — editing is `draft`-only, and
 *  Approve/Reject/Archive/Restore/Delete are all Admin/Super-Admin-only,
 *  never offered here at all). */
export function InstructorCourseRowActions({ course }: { course: CourseListItem }) {
  const tc = useTranslations("Admin.courses");
  const t = useTranslations("Instructor.myCourses");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmitForReview() {
    startTransition(async () => {
      const result = await submitCourseForReviewAction(course.id, course.updatedAt);
      if (result.success) {
        toast.success(tc("toasts.submittedForReview"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(tc("toasts.conflict"));
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
            aria-label={tc("actionsFor", { title: course.title })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {course.status === "draft" && (
          <DropdownMenuItem onClick={() => router.push(`/instructor/courses/${course.id}/edit`)}>
            {tc("actions.edit")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push(`/instructor/courses/${course.id}/curriculum`)}>
          {t("actions.curriculum")}
        </DropdownMenuItem>
        {course.status === "draft" && (
          <DropdownMenuItem onClick={handleSubmitForReview}>{tc("actions.submitForReview")}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
