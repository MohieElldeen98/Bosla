"use server";

import { AuthService } from "@/auth/services/auth.service";
import type { ResetPasswordAction } from "@/auth/actions/action-contracts";

export const resetPasswordAction: ResetPasswordAction = async (input) => {
  return AuthService.resetPassword(input);
};
