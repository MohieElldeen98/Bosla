import { requireGuest } from "@/auth/guards/require-guest";
import type { Locale } from "@/i18n/routing";

/**
 * Sign-in/sign-up/forgot-password/reset-password pages (Step 5.2) will live
 * under this group. Guest-only: an already-authenticated user is bounced to
 * their own default surface instead of seeing auth forms again.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireGuest(locale as Locale);
  return <>{children}</>;
}
