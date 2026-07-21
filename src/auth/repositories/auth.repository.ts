import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { OAuthProvider } from "@/auth/types/oauth";

/**
 * Thin data-access wrapper around Supabase Auth (`auth.users`) — the
 * identity/credentials store. Never holds profile data (name, avatar,
 * role display) — see `profile.repository.ts` for that. Every method is a
 * pass-through to the Supabase SDK so `auth.service.ts` stays the only
 * place with actual auth business logic. Function names follow
 * docs/authentication-architecture.md's Repository contract exactly.
 */
export const AuthRepository = {
  // `getCurrentUser`/`getSession` are called on effectively every
  // navigation (by every guard, and indirectly by middleware) — wrapped in
  // try/catch so a missing/misconfigured Supabase env var (client
  // construction throws synchronously) degrades to "no session" instead of
  // 500-ing every page on the site, including public marketing pages. The
  // auth-*performing* methods below intentionally do NOT catch: if
  // Supabase truly can't be reached, sign-up/sign-in should fail loudly,
  // not pretend to succeed.
  async getCurrentUser() {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    } catch (error) {
      logger.error("[AuthRepository.getCurrentUser]", error);
      return null;
    }
  },

  async getSession() {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session;
    } catch (error) {
      logger.error("[AuthRepository.getSession]", error);
      return null;
    }
  },

  /** Explicit refresh, exposed for callers that need it outside the implicit
   *  per-request refresh `getCurrentUser()` already performs (see
   *  `middleware/session.ts`) — e.g. a long-lived client tab extending its
   *  own session without a full navigation. */
  async refreshSession() {
    const supabase = await createClient();
    return supabase.auth.refreshSession();
  },

  async signUp(input: {
    email: string;
    password: string;
    fullName: string;
    profession?: string | null;
    country?: string | null;
    language?: string | null;
    emailRedirectTo?: string;
  }) {
    const supabase = await createClient();
    return supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        // Mirrored into `raw_user_meta_data`, which the
        // `handle_new_user()` DB trigger (drizzle/0001_*.sql) reads to
        // bootstrap a profile row — this is what makes automatic profile
        // creation work even for a signup path that never reaches
        // `ProfileService.bootstrapProfile` (e.g. a future OAuth signup).
        data: {
          full_name: input.fullName,
          profession: input.profession ?? null,
          country: input.country ?? null,
          language: input.language ?? "en",
        },
        emailRedirectTo: input.emailRedirectTo,
      },
    });
  },

  async signIn(input: { email: string; password: string }) {
    const supabase = await createClient();
    return supabase.auth.signInWithPassword(input);
  },

  /** Generic OAuth entry point — every provider-specific method below is a
   *  thin wrapper over this, so adding a provider never touches this
   *  function. */
  async signInWithOAuth(provider: OAuthProvider, redirectTo: string) {
    const supabase = await createClient();
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  },

  async signInWithGoogle(redirectTo: string) {
    return AuthRepository.signInWithOAuth("google", redirectTo);
  },

  async signOut() {
    const supabase = await createClient();
    return supabase.auth.signOut();
  },

  async forgotPassword(email: string, redirectTo: string) {
    const supabase = await createClient();
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async resetPassword(newPassword: string) {
    const supabase = await createClient();
    return supabase.auth.updateUser({ password: newPassword });
  },

  /** Supabase's own built-in flow sends a confirmation link to the NEW
   *  address before the change takes effect — `emailRedirectTo` is
   *  where that link lands, same "locale-aware redirect" shape
   *  `forgotPassword` already uses. No custom verification needed. */
  async changeEmail(newEmail: string, emailRedirectTo: string) {
    const supabase = await createClient();
    return supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo });
  },

  /** Verifies the `token_hash` Supabase emails for sign-up confirmation and
   *  password recovery links — see `src/app/auth/confirm/route.ts`. */
  async verifyOtp(params: { type: EmailOtpType; tokenHash: string }) {
    const supabase = await createClient();
    return supabase.auth.verifyOtp({ type: params.type, token_hash: params.tokenHash });
  },

  /** Completes the OAuth (PKCE) callback — the `code` param Google/etc.
   *  redirect back with, distinct from the email `token_hash` flow above. */
  async exchangeCodeForSession(code: string) {
    const supabase = await createClient();
    return supabase.auth.exchangeCodeForSession(code);
  },

  async resendVerificationEmail(email: string, emailRedirectTo?: string) {
    const supabase = await createClient();
    return supabase.auth.resend({
      type: "signup",
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
  },
};
