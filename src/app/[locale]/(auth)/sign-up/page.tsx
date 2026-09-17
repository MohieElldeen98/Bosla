import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { ProfessionService } from "@/services/profession.service";
import { CountryService } from "@/services/country.service";
import type { Locale } from "@/i18n/routing";
import { SignUpForm } from "./SignUpForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.SignUp" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Auth.SignUp");

  const [professions, countries] = await Promise.all([
    ProfessionService.getAll(locale as Locale),
    CountryService.getAll(locale as Locale),
  ]);

  return (
    <AuthLayout>
      <AuthCard className="max-w-lg">
        <AuthHeader title={t("title")} subtitle={t("subtitle")} />
        <SignUpForm professions={professions} countries={countries} />
      </AuthCard>
    </AuthLayout>
  );
}
