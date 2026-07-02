"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { VerifyEmailIllustration } from "@/components/auth/VerifyEmailIllustration";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { LoadingButton } from "@/components/auth/LoadingButton";
import type { Locale } from "@/i18n/routing";
import { resendVerificationEmailAction } from "@/auth/actions/resend-verification-email.action";

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyEmailClient({
  email,
  isVerified,
}: {
  email: string | null;
  isVerified: boolean;
}) {
  const t = useTranslations("Auth.VerifyEmail");
  const tShared = useTranslations("Auth.Shared");
  const locale = useLocale() as Locale;
  const prefersReducedMotion = useReducedMotion();

  const [cooldown, setCooldown] = useState(isVerified ? 0 : RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email) return;
    setIsResending(true);
    setResendMessage(null);
    const result = await resendVerificationEmailAction({ email }, locale);
    setIsResending(false);
    if (result.success) {
      setResendMessage(t("resendSuccess"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setResendMessage(tShared("genericError"));
    }
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.4 }}
      className="text-center"
    >
      <VerifyEmailIllustration variant={isVerified ? "verified" : "pending"} />

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {isVerified ? t("verifiedTitle") : t("pendingTitle")}
      </h1>
      <p className="mt-2 text-sm text-slate-500 sm:text-base">
        {isVerified
          ? t("verifiedMessage")
          : email
            ? t("pendingMessage", { email })
            : t("pendingMessageGeneric")}
      </p>

      {isVerified ? (
        <AuthFooter actionLabel={t("goToSignIn")} href="/sign-in" />
      ) : (
        <div className="mt-6 space-y-2">
          <LoadingButton
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            isLoading={isResending}
            disabled={cooldown > 0 || !email}
            onClick={handleResend}
          >
            {cooldown > 0 ? t("resendCooldown", { seconds: cooldown }) : t("resendCta")}
          </LoadingButton>
          {resendMessage ? (
            <p role="status" className="text-sm text-slate-500">
              {resendMessage}
            </p>
          ) : null}
          <AuthFooter actionLabel={tShared("backToHome")} href="/" />
        </div>
      )}
    </motion.div>
  );
}
