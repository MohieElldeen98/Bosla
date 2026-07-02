"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { LoadingButton } from "@/components/auth/LoadingButton";
import type { Locale } from "@/i18n/routing";
import { forgotPasswordAction } from "@/auth/actions/forgot-password.action";
import {
  createForgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/auth/validators/forgot-password.validator";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.ForgotPassword");
  const tShared = useTranslations("Auth.Shared");
  const locale = useLocale() as Locale;
  const prefersReducedMotion = useReducedMotion();

  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const schema = createForgotPasswordSchema({
    emailRequired: t("errors.emailRequired"),
    emailInvalid: t("errors.emailInvalid"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    const result = await forgotPasswordAction(values, locale);
    if (!result.success) {
      setServerError(tShared("genericError"));
      return;
    }
    setSubmittedEmail(values.email);
  }

  const transition = { duration: prefersReducedMotion ? 0.2 : 0.4 };
  const initial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 };

  if (submittedEmail) {
    return (
      <motion.div
        initial={initial}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="text-center"
      >
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <MailCheck aria-hidden="true" className="size-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{t("successTitle")}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {t("successMessage", { email: submittedEmail })}
        </p>
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
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <LoadingButton type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? t("submitting") : t("submit")}
        </LoadingButton>
      </AuthForm>

      <AuthFooter actionLabel={t("backToSignIn")} href="/sign-in" />
    </motion.div>
  );
}
