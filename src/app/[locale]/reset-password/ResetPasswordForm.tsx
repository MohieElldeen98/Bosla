"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { resetPasswordAction } from "@/auth/actions/reset-password.action";
import {
  createResetPasswordSchema,
  type ResetPasswordInput,
} from "@/auth/validators/reset-password.validator";

export function ResetPasswordForm() {
  const t = useTranslations("Auth.ResetPassword");
  const tShared = useTranslations("Auth.Shared");
  const prefersReducedMotion = useReducedMotion();

  const [serverError, setServerError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const schema = createResetPasswordSchema({
    passwordTooShort: t("errors.passwordTooShort"),
    confirmPasswordRequired: t("errors.confirmPasswordRequired"),
    passwordsDoNotMatch: t("errors.passwordsDoNotMatch"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const result = await resetPasswordAction(values);
    if (!result.success) {
      setServerError(tShared("genericError"));
      return;
    }
    setSucceeded(true);
  }

  const transition = { duration: prefersReducedMotion ? 0.2 : 0.4 };
  const initial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 };

  if (succeeded) {
    return (
      <motion.div
        initial={initial}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="text-center"
      >
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 aria-hidden="true" className="size-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{t("successTitle")}</h2>
        <p className="mt-2 text-sm text-slate-500">{t("successMessage")}</p>
        <AuthFooter actionLabel={t("backToSignIn")} href="/sign-in" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={initial} animate={{ opacity: 1, y: 0 }} transition={transition}>
      <AuthForm onSubmit={handleSubmit(onSubmit)}>
        {serverError ? (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password ? (
            <p id="password-error" role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder={t("confirmPasswordPlaceholder")}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p id="confirmPassword-error" role="alert" className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <LoadingButton type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? t("submitting") : t("submit")}
        </LoadingButton>
      </AuthForm>
    </motion.div>
  );
}
