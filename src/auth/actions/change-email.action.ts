"use server";

import { AuthService } from "@/auth/services/auth.service";
import { siteUrl } from "@/lib/site-config";
import type { ChangeEmailAction } from "@/auth/actions/action-contracts";

export const changeEmailAction: ChangeEmailAction = async (input, locale) => {
  const next = `/${locale}/me/settings`;
  const redirectTo = `${siteUrl.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
  return AuthService.changeEmail(input, redirectTo);
};
