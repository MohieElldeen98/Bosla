"use server";

import { AuthService } from "@/auth/services/auth.service";
import { SessionService } from "@/auth/services/session.service";
import type { ChangePasswordAction } from "@/auth/actions/action-contracts";

export const changePasswordAction: ChangePasswordAction = async (input) => {
  const user = await SessionService.getCurrentUser();
  if (!user?.email) {
    return { success: false, code: "invalid_credentials", message: "You must be signed in." };
  }
  return AuthService.changePassword(user.email, input);
};
