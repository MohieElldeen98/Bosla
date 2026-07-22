import type { EmailOtpType } from "@supabase/supabase-js";
import { AuthRepository } from "@/auth/repositories/auth.repository";
import { ProfileService } from "@/auth/services/profile.service";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import { mapSupabaseAuthError } from "@/auth/utils/map-supabase-error";
import { logger } from "@/lib/logger";
import type { AuthActionResult } from "@/auth/types/result";
import type { OAuthProvider } from "@/auth/types/oauth";
import type { SignUpInput } from "@/auth/validators/sign-up.validator";
import type { SignInInput } from "@/auth/validators/sign-in.validator";
import type { ForgotPasswordInput } from "@/auth/validators/forgot-password.validator";
import type { ResetPasswordInput } from "@/auth/validators/reset-password.validator";
import type { ChangePasswordInput } from "@/auth/validators/change-password.validator";
import type { ChangeEmailInput } from "@/auth/validators/change-email.validator";

/**
 * Every AuthRepository method that performs a real Supabase operation can
 * throw synchronously — not from Supabase itself, but from the client
 * *construction* step (`createClient()`) when env vars are missing/invalid
 * (see `lib/env.ts`). Without this, that throw would propagate out of a
 * Server Action uncaught, producing a raw 500 instead of the same clean
 * `AuthActionResult` failure every other error path returns — i.e. "fail
 * gracefully if variables are missing" has to hold here too, not just for
 * session reads (`AuthRepository.getCurrentUser`/`getSession` already
 * handle their own case). One wrapper, reused by every method below,
 * instead of a try/catch repeated nine times.
 */
async function runAuthOperation<T>(
  operation: () => Promise<AuthActionResult<T>>,
): Promise<AuthActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[AuthService]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

/**
 * Orchestrates AuthRepository (Supabase Auth) and, via `ProfileService`,
 * the Profile domain — so callers never talk to either directly. No React
 * imports, no UI/redirect logic. Every method returns an `AuthActionResult`
 * and never throws. Navigation is the caller's job: `auth/guards/*` for
 * route protection, `auth/actions/*` for post-submit redirects,
 * `auth/utils/role.utils.ts` for "where does this role land." Role
 * *extraction* is deliberately NOT here — see `session.service.ts`, which
 * resolves role from the session JWT for guards/middleware.
 */
export const AuthService = {
  async signUp(
    input: SignUpInput,
    emailRedirectTo?: string,
  ): Promise<AuthActionResult<{ requiresEmailVerification: boolean }>> {
    return runAuthOperation(async () => {
      const { data, error } = await AuthRepository.signUp({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        profession: input.profession,
        country: input.country,
        language: input.language,
        emailRedirectTo,
      });

      if (error || !data.user) {
        return {
          success: false,
          code: mapSupabaseAuthError(error),
          message: error?.message ?? "Sign up failed.",
        };
      }

      try {
        // Creates the profile row alongside the new Supabase Auth
        // identity. Idempotent — see `ProfileRepository.create` — so this
        // is safe even though the `handle_new_user()` DB trigger
        // (drizzle/0001_*.sql) is racing to create the same row.
        await ProfileService.bootstrapProfile({
          userId: data.user.id,
          email: input.email,
          fullName: input.fullName,
          profession: input.profession,
          country: input.country,
          language: input.language,
        });
      } catch (profileError) {
        // The Supabase Auth identity above is what actually determines
        // whether sign-up succeeded — the DB trigger is a second,
        // independent path to the same profile row, so a failure here
        // (e.g. DATABASE_URL unreachable) is logged, not fatal.
        logger.warn("[AuthService.signUp] profile bootstrap failed:", profileError);
      }

      if (input.accountType === "instructor") {
        try {
          // Picking "Instructor" at sign-up auto-submits the same pending
          // `instructor_profiles` application a student would otherwise
          // fill in later — role stays `student` until an Admin approves
          // it via `/admin/instructors` (see `InstructorApplicationService.approve`).
          // Best-effort like profile bootstrap above: a failure here must
          // never fail sign-up itself.
          await InstructorApplicationService.submitFromSignUp(data.user.id, input.fullName);
        } catch (applicationError) {
          logger.warn("[AuthService.signUp] instructor application submission failed:", applicationError);
        }
      }

      return {
        success: true,
        data: { requiresEmailVerification: data.session === null },
      };
    });
  },

  async signIn(input: SignInInput): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { data, error } = await AuthRepository.signIn(input);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      if (data.user) {
        await ProfileService.recordLogin(data.user.id);
      }
      return { success: true, data: undefined };
    });
  },

  /** Generic entry point — `signInWithGoogle` etc. are thin wrappers, so
   *  adding Apple/Microsoft/GitHub never touches this method. */
  async signInWithOAuth(
    provider: OAuthProvider,
    redirectTo: string,
  ): Promise<AuthActionResult<{ url: string }>> {
    return runAuthOperation(async () => {
      const { data, error } = await AuthRepository.signInWithOAuth(provider, redirectTo);
      if (error || !data.url) {
        return {
          success: false,
          code: mapSupabaseAuthError(error),
          message: error?.message ?? "Could not start sign-in.",
        };
      }
      return { success: true, data: { url: data.url } };
    });
  },

  async signInWithGoogle(redirectTo: string): Promise<AuthActionResult<{ url: string }>> {
    return AuthService.signInWithOAuth("google", redirectTo);
  },

  async signOut(): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { error } = await AuthRepository.signOut();
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      return { success: true, data: undefined };
    });
  },

  async forgotPassword(input: ForgotPasswordInput, redirectTo: string): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { error } = await AuthRepository.forgotPassword(input.email, redirectTo);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      return { success: true, data: undefined };
    });
  },

  async resetPassword(input: ResetPasswordInput): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { error } = await AuthRepository.resetPassword(input.password);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      return { success: true, data: undefined };
    });
  },

  /** `/me/settings`'s "Change password" — Supabase has no dedicated
   *  "verify current password without a full sign-in" call, so
   *  verification IS a real `signInWithPassword` against the current
   *  email; only on success does `resetPassword`'s underlying
   *  `updateUser({password})` run. Wrong current password surfaces as
   *  `invalid_credentials`, the same code sign-in itself uses. */
  async changePassword(currentEmail: string, input: ChangePasswordInput): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { error: verifyError } = await AuthRepository.signIn({
        email: currentEmail,
        password: input.currentPassword,
      });
      if (verifyError) {
        return { success: false, code: "invalid_credentials", message: "Current password is incorrect." };
      }
      const { error } = await AuthRepository.resetPassword(input.password);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      return { success: true, data: undefined };
    });
  },

  /** `/me/settings`'s "Change email" — Supabase emails a confirmation
   *  link to the NEW address; the change only takes effect once that's
   *  clicked, so this call succeeding just means "confirmation sent,"
   *  not "email changed yet." */
  async changeEmail(input: ChangeEmailInput, emailRedirectTo: string): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { error } = await AuthRepository.changeEmail(input.newEmail, emailRedirectTo);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      return { success: true, data: undefined };
    });
  },

  async resendVerificationEmail(
    email: string,
    emailRedirectTo?: string,
  ): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { error } = await AuthRepository.resendVerificationEmail(email, emailRedirectTo);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      return { success: true, data: undefined };
    });
  },

  /** Used by `src/app/auth/confirm/route.ts` for both sign-up confirmation
   *  and password-recovery links (the `type` query param Supabase appends
   *  distinguishes them). On a successful sign-up confirmation, activates
   *  the profile (`pending` → `active`) and records the login. */
  async verifyOtp(params: { type: EmailOtpType; tokenHash: string }): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { data, error } = await AuthRepository.verifyOtp(params);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      if (data.user && params.type === "signup") {
        await ProfileService.activateProfile(data.user.id);
      }
      if (data.user) {
        await ProfileService.recordLogin(data.user.id);
      }
      return { success: true, data: undefined };
    });
  },

  /** Used by `src/app/auth/confirm/route.ts` for the OAuth (PKCE) callback. */
  async exchangeCodeForSession(code: string): Promise<AuthActionResult> {
    return runAuthOperation(async () => {
      const { data, error } = await AuthRepository.exchangeCodeForSession(code);
      if (error) {
        return { success: false, code: mapSupabaseAuthError(error), message: error.message };
      }
      if (data.user) {
        await ProfileService.recordLogin(data.user.id);
      }
      return { success: true, data: undefined };
    });
  },
};
