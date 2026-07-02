"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { Link, useRouter } from "@/i18n/navigation";
import { signInAction } from "@/auth/actions/sign-in.action";
import { createSignInSchema, type SignInInput } from "@/auth/validators/sign-in.validator";
import { isSafeRedirectPath } from "@/auth/utils/is-safe-redirect-path";
import { stripLocalePrefix } from "@/i18n/strip-locale-prefix";

export function SignInForm({
  hasExpiredLinkError,
  redirectTo,
}: {
  hasExpiredLinkError: boolean;
  redirectTo: string | null;
}) {
  const t = useTranslations("Auth.SignIn");
  const tShared = useTranslations("Auth.Shared");
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [serverError, setServerError] = useState<string | null>(
    hasExpiredLinkError ? t("linkExpired") : null,
  );
  const [rememberMe, setRememberMe] = useState(true);

  const schema = createSignInSchema({
    emailRequired: t("errors.emailRequired"),
    emailInvalid: t("errors.emailInvalid"),
    passwordRequired: t("errors.passwordRequired"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(schema) });

  async function onSubmit(values: SignInInput) {
    setServerError(null);
    const result = await signInAction(values);

    if (!result.success) {
      const message =
        result.code === "invalid_credentials"
          ? t("errors.invalidCredentials")
          : result.code === "email_not_verified"
            ? t("errors.emailNotVerified")
            : tShared("genericError");
      setServerError(message);
      return;
    }

    router.push(
      isSafeRedirectPath(redirectTo) ? stripLocalePrefix(redirectTo) : result.data.redirectTo,
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.4 }}
    >
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
            aria-describedby={errors.email ? "sign-in-email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p id="sign-in-email-error" role="alert" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "sign-in-password-error" : undefined}
            {...register("password")}
          />
          {errors.password ? (
            <p id="sign-in-password-error" role="alert" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={setRememberMe} />
          <Label htmlFor="rememberMe" className="font-normal text-slate-600">
            {t("rememberMe")}
          </Label>
        </div>

        <LoadingButton
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </LoadingButton>

        <AuthDivider label={tShared("orContinueWith")} />
        <SocialLoginButton />
      </AuthForm>

      <AuthFooter prompt={t("noAccount")} actionLabel={t("createAccount")} href="/sign-up" />
    </motion.div>
  );
}
