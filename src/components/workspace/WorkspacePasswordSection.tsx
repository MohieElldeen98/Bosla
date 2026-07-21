"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Card } from "@/components/ui/card";
import { changePasswordAction } from "@/auth/actions/change-password.action";
import { createChangePasswordSchema, type ChangePasswordInput } from "@/auth/validators/change-password.validator";

/** `/me/settings`'s password section — requires the current password
 *  (re-verified server-side via a real sign-in call, Supabase has no
 *  dedicated "verify without signing in" primitive). */
export function WorkspacePasswordSection() {
  const t = useTranslations("Me.settings.password");

  const schema = createChangePasswordSchema({
    currentPasswordRequired: t("errors.currentPasswordRequired"),
    passwordTooShort: t("errors.passwordTooShort"),
    confirmPasswordRequired: t("errors.confirmPasswordRequired"),
    passwordsDoNotMatch: t("errors.passwordsDoNotMatch"),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ChangePasswordInput) {
    const result = await changePasswordAction(values);
    if (result.success) {
      toast.success(t("changed"));
      reset();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-sm space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">{t("currentPasswordLabel")}</Label>
          <PasswordInput id="currentPassword" autoComplete="current-password" {...register("currentPassword")} />
          {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t("newPasswordLabel")}</Label>
          <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
          <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>
        <LoadingButton type="submit" isLoading={isSubmitting}>
          {t("save")}
        </LoadingButton>
      </form>
    </Card>
  );
}
