import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/auth/guards/require-auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import type { Locale } from "@/i18n/routing";
import { ResetPasswordForm } from "./ResetPasswordForm";

/**
 * Deliberately NOT under the (auth) route group: a user only reaches this
 * page with a real (recovery) Supabase session already established by
 * `/auth/confirm`, so it needs `requireAuth` (any session), not
 * `requireGuest` — see docs/authentication-architecture.md and
 * `auth/constants/routes.ts`'s `GUEST_ONLY_PATHS` comment.
 */
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAuth(locale as Locale);
  const t = await getTranslations("Auth.ResetPassword");

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader title={t("title")} subtitle={t("subtitle")} />
        <ResetPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
