"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { googleSignInAction } from "@/auth/actions/google-sign-in.action";
import { LoadingButton } from "@/components/auth/LoadingButton";
import type { Locale } from "@/i18n/routing";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.42-.22-2.05H12v3.9h6.5c-.13 1.02-.84 2.56-2.42 3.6l-.02.15 3.52 2.63.24.02c2.24-2.02 3.53-5 3.53-8.25z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.05 7.93-2.87l-3.78-2.83c-1.02.7-2.4 1.18-4.15 1.18-3.16 0-5.84-2.02-6.8-4.83l-.14.01-3.68 2.75-.05.14C3.26 21.36 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.65a6.9 6.9 0 0 1-.38-2.65c0-.92.16-1.81.37-2.65L5.18 9.2 1.45 6.4l-.12.06A12 12 0 0 0 0 12c0 1.93.46 3.76 1.33 5.6l3.87-2.95z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c2.26 0 3.78.97 4.65 1.79l3.4-3.32C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.64 1.33 6.4l3.87 2.95c.96-2.81 3.64-4.6 6.8-4.6z"
      />
    </svg>
  );
}

/**
 * Calls the `googleSignInAction` Server Action (which calls
 * `AuthService.signInWithGoogle`) to get Supabase's OAuth redirect URL, then
 * navigates the browser there — never touches Supabase directly.
 */
export function SocialLoginButton() {
  const t = useTranslations("Auth.Shared");
  const locale = useLocale() as Locale;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    const result = await googleSignInAction(locale);
    if (result.success) {
      window.location.href = result.data.url;
      return;
    }
    setError(t("genericError"));
    setIsLoading(false);
  }

  return (
    <div className="space-y-2">
      <LoadingButton
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        isLoading={isLoading}
        onClick={handleClick}
      >
        <GoogleIcon aria-hidden="true" className="size-4" />
        {t("continueWithGoogle")}
      </LoadingButton>
      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
