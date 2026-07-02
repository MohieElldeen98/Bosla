"use server";

import { AuthService } from "@/auth/services/auth.service";
import { siteUrl } from "@/lib/site-config";
import type { GoogleSignInAction } from "@/auth/actions/action-contracts";

export const googleSignInAction: GoogleSignInAction = async (locale) => {
  const next = `/${locale}`;
  const redirectTo = `${siteUrl.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
  return AuthService.signInWithGoogle(redirectTo);
};
