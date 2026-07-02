"use server";

import { AuthService } from "@/auth/services/auth.service";
import type { SignOutAction } from "@/auth/actions/action-contracts";

export const signOutAction: SignOutAction = async () => {
  return AuthService.signOut();
};
