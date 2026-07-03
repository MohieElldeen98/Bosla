"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CourseCombobox } from "@/components/admin/users/CourseCombobox";
import { grantEnrollmentAction } from "@/learning/actions/enrollment.actions";

/**
 * The Enrollments tab's own Grant form (Phase 7) — `studentId` is fixed
 * to the profile being viewed (not a form field, unlike
 * `CreateEnrollmentForm`'s student+course pair on `/admin/enrollments/
 * new`), so only a course needs picking. Calls the existing
 * `grantEnrollmentAction` as-is — no parallel enrollment-creation logic.
 */
export function GrantEnrollmentForm({
  studentId,
  courses,
}: {
  studentId: string;
  courses: { value: string; label: string }[];
}) {
  const t = useTranslations("Admin.users");
  const router = useRouter();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!courseId) {
      toast.error(t("enrollments.selectCourseError"));
      return;
    }
    startTransition(async () => {
      const result = await grantEnrollmentAction({ studentId, courseId, source: "manual_grant" });
      if (result.success) {
        toast.success(t("enrollments.grantSuccess"));
        setCourseId(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <label className="text-sm font-medium text-foreground">{t("fields.course")}</label>
        <CourseCombobox
          options={courses}
          value={courseId}
          onValueChange={setCourseId}
          placeholder={t("fields.coursePlaceholder")}
          disabled={isPending}
        />
      </div>
      <Button type="button" onClick={handleSubmit} disabled={isPending || !courseId}>
        {isPending ? t("enrollments.granting") : t("enrollments.grant")}
      </Button>
    </div>
  );
}
