import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth.ForgotPassword");

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader title={t("title")} subtitle={t("subtitle")} />
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
