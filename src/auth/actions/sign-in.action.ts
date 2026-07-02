"use server";

import { AuthService } from "@/auth/services/auth.service";
import { SessionService } from "@/auth/services/session.service";
import { getDefaultRedirectPath } from "@/auth/utils/role.utils";
import type { SignInAction } from "@/auth/actions/action-contracts";

export const signInAction: SignInAction = async (input) => {
  const result = await AuthService.signIn(input);
  if (!result.success) return result;

  const user = await SessionService.getCurrentUser();
  return { success: true, data: { redirectTo: user ? getDefaultRedirectPath(user.role) : "/" } };
};
