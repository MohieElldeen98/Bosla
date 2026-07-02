import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string; redirectTo?: string }>;
}) {
  const t = await getTranslations("Auth.SignIn");
  const { authError, redirectTo } = await searchParams;

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader title={t("title")} subtitle={t("subtitle")} />
        <SignInForm
          hasExpiredLinkError={authError === "expired_token"}
          redirectTo={redirectTo ?? null}
        />
      </AuthCard>
    </AuthLayout>
  );
}
