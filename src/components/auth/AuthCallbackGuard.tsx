"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { SessionClientService } from "@/auth/services/session-client.service";

/**
 * Two layers of defense against a misdirected Supabase auth callback,
 * confirmed live in production (docs/authentication-architecture.md,
 * "Profile lifecycle" — the forgot-password investigation): clicking a
 * password-recovery link redirected to bare `/{locale}` with an unused
 * `?code=` still in the URL, not `/auth/confirm`, and not signed in at
 * all — root-caused to Supabase's Redirect URLs allow-list not matching
 * our `redirectTo`, so GoTrue falls back to the Site URL instead. That's
 * a dashboard config fix, not one this code can make — but the app can
 * still recover from it:
 *
 * 1. A stray `?code=` on any page (this one) means the PKCE authorization
 *    code never reached `/auth/confirm`'s server-side exchange — the only
 *    place that can read the httpOnly code-verifier cookie
 *    `resetPasswordForEmail`/`signUp` set, so the client SDK's own
 *    `detectSessionInUrl` cannot complete this on its own. Forward it to
 *    `/auth/confirm`, which exchanges it and redirects onward. `next`
 *    defaults to the homepage there (the original intended destination
 *    isn't recoverable from a bare code), which is fine: if the code was
 *    for a recovery flow, layer 2 below catches it from there.
 * 2. Supabase's dedicated `PASSWORD_RECOVERY` event fires once a recovery
 *    session is actually established, wherever that happens to be —
 *    `onAuthStateChange` can't otherwise tell it apart from a normal
 *    sign-in. Force a redirect to `/reset-password` so the visitor
 *    actually reaches a "set a new password" form instead of silently
 *    landing in the signed-in app.
 *
 * Mounted once, globally (same convention as `ClientErrorListener`/
 * `LegalAcceptanceModal` in this layout), rather than inside
 * `useSession()`, which multiple components mount independently — both
 * of these only need to fire once, from wherever the visitor lands.
 */
export function AuthCallbackGuard() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && window.location.pathname !== "/auth/confirm") {
      window.location.replace(`/auth/confirm?code=${encodeURIComponent(code)}`);
      return;
    }

    const subscription = SessionClientService.onPasswordRecovery(() => {
      router.replace("/reset-password");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
