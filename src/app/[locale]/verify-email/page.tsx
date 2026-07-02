import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { VerifyEmailClient } from "./VerifyEmailClient";

/**
 * Ungated — reachable both right after sign-up (no session yet, pending
 * state) and right after clicking the emailed confirmation link (a fresh
 * session now exists, `?status=verified`). See
 * docs/authentication-architecture.md for why this can't sit under the
 * (auth) route group's guest-only guard.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; status?: string }>;
}) {
  const { email, status } = await searchParams;

  return (
    <AuthLayout>
      <AuthCard>
        <VerifyEmailClient email={email ?? null} isVerified={status === "verified"} />
      </AuthCard>
    </AuthLayout>
  );
}
