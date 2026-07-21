import type { AuthActionResult } from "@/auth/types/result";
import type { SignUpInput } from "@/auth/validators/sign-up.validator";
import type { SignInInput } from "@/auth/validators/sign-in.validator";
import type { ForgotPasswordInput } from "@/auth/validators/forgot-password.validator";
import type { ResetPasswordInput } from "@/auth/validators/reset-password.validator";
import type { ChangePasswordInput } from "@/auth/validators/change-password.validator";
import type { ChangeEmailInput } from "@/auth/validators/change-email.validator";
import type { Locale } from "@/i18n/routing";
import type { Profile } from "@/auth/types/profile";

/**
 * Function-signature contracts implemented as real `"use server"` bodies in
 * this folder (see each `*.action.ts`), calling `AuthService` under the
 * hood — UI components never call Supabase or a repository directly.
 * `locale` is threaded through wherever a Supabase email needs a
 * locale-aware `redirectTo` (the caller reads it from `useLocale()`).
 */
export type SignUpAction = (
  input: SignUpInput,
  locale: Locale,
) => Promise<AuthActionResult<{ requiresEmailVerification: boolean }>>;

export type SignInAction = (
  input: SignInInput,
) => Promise<AuthActionResult<{ redirectTo: string }>>;

export type SignOutAction = () => Promise<AuthActionResult>;

export type ForgotPasswordAction = (
  input: ForgotPasswordInput,
  locale: Locale,
) => Promise<AuthActionResult>;

export type ResetPasswordAction = (input: ResetPasswordInput) => Promise<AuthActionResult>;

/** Reuses `ForgotPasswordInput` — both flows only ever collect an email. */
export type ResendVerificationEmailAction = (
  input: ForgotPasswordInput,
  locale: Locale,
) => Promise<AuthActionResult>;

export type GoogleSignInAction = (locale: Locale) => Promise<AuthActionResult<{ url: string }>>;

/** `/me/settings` — reads the current user's own session, so there's no
 *  target-user parameter, same "self-scoped" reasoning `GetMyProfileAction`
 *  gives. */
export type ChangePasswordAction = (input: ChangePasswordInput) => Promise<AuthActionResult>;

export type ChangeEmailAction = (input: ChangeEmailInput, locale: Locale) => Promise<AuthActionResult>;

/** Self-scoped — always the caller's own profile, never a target user's,
 *  so there's no id parameter and no separate authorization question. */
export type GetMyProfileAction = () => Promise<Profile | null>;
