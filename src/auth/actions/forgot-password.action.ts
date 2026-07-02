"use server";

import { AuthService } from "@/auth/services/auth.service";
import { siteUrl } from "@/lib/site-config";
import type { ForgotPasswordAction } from "@/auth/actions/action-contracts";

export const forgotPasswordAction: ForgotPasswordAction = async (input, locale) => {
  const next = `/${locale}/reset-password`;
  const redirectTo = `${siteUrl.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
  return AuthService.forgotPassword(input, redirectTo);
};
