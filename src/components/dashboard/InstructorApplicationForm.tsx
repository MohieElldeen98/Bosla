"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { applyForInstructorAction } from "@/instructor/actions/instructor-application.actions";
import {
  applyForInstructorSchema,
  type ApplyForInstructorInput,
} from "@/instructor/validators/instructor-application.validator";

/**
 * `/dashboard/apply-instructor`'s form (Phase 6, Step 6.1) — mirrors
 * `CreateEnrollmentForm`'s simplicity (a small, one-shot form, not
 * `SectionFormShell`'s heavier editable-draft infra). Reuses
 * `LocalizedTextField`/`PlainTextField` from the CMS/Homepage editor
 * as-is — both are already generic over form-value shape, not CMS- or
 * Homepage-specific.
 */
export function InstructorApplicationForm() {
  const t = useTranslations("Instructor.apply");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyForInstructorInput>({
    resolver: zodResolver(applyForInstructorSchema),
    defaultValues: { headline: { en: "", ar: "" }, credentials: "" },
  });

  async function onSubmit(values: ApplyForInstructorInput) {
    setError(null);
    const result = await applyForInstructorAction(values);
    if (!result.success) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    toast.success(t("toasts.submitted"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-lg space-y-5">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <LocalizedTextField
        id="instructor-application-headline"
        label={t("form.headlineLabel")}
        name="headline"
        register={register}
        errors={errors}
      />

      <PlainTextField
        id="instructor-application-credentials"
        label={t("form.credentialsLabel")}
        name="credentials"
        register={register}
        errors={errors}
        hint={t("form.credentialsHint")}
        placeholder={t("form.credentialsPlaceholder")}
      />

      <div className="flex items-center justify-end border-t border-border pt-4">
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? t("form.submitting") : t("form.submit")}
        </LoadingButton>
      </div>
    </form>
  );
}
