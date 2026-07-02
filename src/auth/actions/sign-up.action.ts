"use server";

import { AuthService } from "@/auth/services/auth.service";
import { siteUrl } from "@/lib/site-config";
import type { SignUpAction } from "@/auth/actions/action-contracts";

export const signUpAction: SignUpAction = async (input, locale) => {
  const next = `/${locale}/verify-email?status=verified`;
  const emailRedirectTo = `${siteUrl.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
  return AuthService.signUp(input, emailRedirectTo);
};
