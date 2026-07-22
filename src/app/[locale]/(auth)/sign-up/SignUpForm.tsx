"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
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
import { ProfessionSelect } from "@/components/auth/ProfessionSelect";
import { AccountTypeToggle } from "@/components/auth/AccountTypeToggle";
import { CountrySelect } from "@/components/auth/CountrySelect";
import { LanguageSelect } from "@/components/auth/LanguageSelect";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { signUpAction } from "@/auth/actions/sign-up.action";
import { createSignUpSchema, type SignUpInput } from "@/auth/validators/sign-up.validator";
import type { ResolvedProfession } from "@/types/profession";
import type { ResolvedCountry } from "@/types/country";

export function SignUpForm({
  professions,
  countries,
}: {
  professions: ResolvedProfession[];
  countries: ResolvedCountry[];
}) {
  const t = useTranslations("Auth.SignUp");
  const tShared = useTranslations("Auth.Shared");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const [serverError, setServerError] = useState<string | null>(null);

  function openLegalDoc(path: "terms" | "privacy") {
    window.open(`/${locale}/${path}`, "_blank", "noopener,noreferrer,width=680,height=760");
  }

  const schema = createSignUpSchema({
    fullNameRequired: t("errors.fullNameRequired"),
    emailRequired: t("errors.emailRequired"),
    emailInvalid: t("errors.emailInvalid"),
    passwordTooShort: t("errors.passwordTooShort"),
    confirmPasswordRequired: t("errors.confirmPasswordRequired"),
    passwordsDoNotMatch: t("errors.passwordsDoNotMatch"),
    professionRequired: t("errors.professionRequired"),
    countryRequired: t("errors.countryRequired"),
    languageRequired: t("errors.languageRequired"),
    acceptTermsRequired: t("errors.acceptTermsRequired"),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      accountType: "student",
      email: "",
      password: "",
      confirmPassword: "",
      profession: "",
      country: "",
      language: locale,
      acceptTerms: false,
    },
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    const result = await signUpAction(values, locale);

    if (!result.success) {
      const message =
        result.code === "email_already_registered"
          ? t("errors.emailAlreadyRegistered")
          : tShared("genericError");
      setServerError(message);
      return;
    }

    if (result.data.requiresEmailVerification) {
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } else {
      router.push("/sign-in");
    }
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
          <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder={t("fullNamePlaceholder")}
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p id="fullName-error" role="alert" className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accountType">{t("accountTypeLabel")}</Label>
          <Controller
            control={control}
            name="accountType"
            render={({ field }) => (
              <AccountTypeToggle
                id="accountType"
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                studentLabel={t("accountTypeStudent")}
                instructorLabel={t("accountTypeInstructor")}
                aria-invalid={!!errors.accountType}
                aria-describedby={errors.accountType ? "accountType-error" : undefined}
              />
            )}
          />
          {errors.accountType ? (
            <p id="accountType-error" role="alert" className="text-sm text-destructive">
              {errors.accountType.message}
            </p>
          ) : null}
          {watch("accountType") === "instructor" ? (
            <p className="text-sm text-muted-foreground">{t("instructorNote")}</p>
          ) : null}
        </div>

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

        <div className="grid gap-5 sm:grid-cols-2">
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
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profession">{t("professionLabel")}</Label>
            <Controller
              control={control}
              name="profession"
              render={({ field }) => (
                <ProfessionSelect
                  id="profession"
                  options={professions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("professionPlaceholder")}
                  name={field.name}
                  aria-invalid={!!errors.profession}
                  aria-describedby={errors.profession ? "profession-error" : undefined}
                />
              )}
            />
            {errors.profession ? (
              <p id="profession-error" role="alert" className="text-sm text-destructive">
                {errors.profession.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">{t("countryLabel")}</Label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <CountrySelect
                  id="country"
                  options={countries}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("countryPlaceholder")}
                  name={field.name}
                  aria-invalid={!!errors.country}
                  aria-describedby={errors.country ? "country-error" : undefined}
                />
              )}
            />
            {errors.country ? (
              <p id="country-error" role="alert" className="text-sm text-destructive">
                {errors.country.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="language">{t("languageLabel")}</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <LanguageSelect
                id="language"
                value={field.value}
                onValueChange={field.onChange}
                placeholder={t("languagePlaceholder")}
                name={field.name}
                aria-invalid={!!errors.language}
                aria-describedby={errors.language ? "language-error" : undefined}
              />
            )}
          />
          {errors.language ? (
            <p id="language-error" role="alert" className="text-sm text-destructive">
              {errors.language.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-start gap-2.5">
            <Controller
              control={control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="acceptTerms"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={!!errors.acceptTerms}
                  aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
                  className="mt-0.5"
                />
              )}
            />
            <Label htmlFor="acceptTerms" className="font-normal text-slate-600">
              {t.rich("acceptTerms", {
                terms: (chunks) => (
                  <button
                    type="button"
                    onClick={() => openLegalDoc("terms")}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {chunks}
                  </button>
                ),
                privacy: (chunks) => (
                  <button
                    type="button"
                    onClick={() => openLegalDoc("privacy")}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {chunks}
                  </button>
                ),
              })}
            </Label>
          </div>
          {errors.acceptTerms ? (
            <p id="acceptTerms-error" role="alert" className="text-sm text-destructive">
              {errors.acceptTerms.message}
            </p>
          ) : null}
        </div>

        <LoadingButton type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
          {isSubmitting ? t("submitting") : t("submit")}
        </LoadingButton>

        <AuthDivider label={tShared("orContinueWith")} />
        <SocialLoginButton />
      </AuthForm>

      <AuthFooter prompt={t("haveAccount")} actionLabel={t("signIn")} href="/sign-in" />
    </motion.div>
  );
}
