"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { SelectField } from "@/components/admin/courses/SelectField";
import { grantEnrollmentAction } from "@/learning/actions/enrollment.actions";
import { enrollmentFormSchema, type EnrollmentFormValues } from "@/learning/validators/enrollment.validator";

interface FormOption {
  id: string;
  label: string;
}

/**
 * `/admin/enrollments/new`'s form (Step 4.2) — just Student + Course;
 * `source` is fixed to `"manual_grant"` (never a form field, no payment
 * fields anywhere), matching this step's explicit scope. Reuses
 * `SelectField` from the Course Editor (Step 3.3) as-is — it's already
 * generic over form-value shape, not Course-specific — rather than
 * building a parallel Select+Controller wrapper. Not built on
 * `SectionFormShell`/dirty-tracking/`useUnsavedChangesGuard`: those exist
 * for *editing* an already-saved draft, and this is a one-shot create
 * with two required fields, not a multi-field editable form.
 */
export function CreateEnrollmentForm({ students, courses }: { students: FormOption[]; courses: FormOption[] }) {
  const t = useTranslations("Admin.enrollments");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: { studentId: "", courseId: "", source: "manual_grant" },
  });

  async function onSubmit(values: EnrollmentFormValues) {
    setError(null);
    const result = await grantEnrollmentAction(values);
    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    toast.success(t("createSuccess"));
    router.push("/admin/enrollments");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-lg space-y-5">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <SelectField
        id="enrollment-student"
        label={t("fields.student")}
        name="studentId"
        control={control}
        options={students.map((student) => ({ value: student.id, label: student.label }))}
        placeholder={t("fields.studentPlaceholder")}
      />

      <SelectField
        id="enrollment-course"
        label={t("fields.course")}
        name="courseId"
        control={control}
        options={courses.map((course) => ({ value: course.id, label: course.label }))}
        placeholder={t("fields.coursePlaceholder")}
      />

      <p className="text-xs text-muted-foreground">{t("sourceHint")}</p>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/enrollments")}>
          {t("cancel")}
        </Button>
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? t("creating") : t("createEnrollment")}
        </LoadingButton>
      </div>
    </form>
  );
}
