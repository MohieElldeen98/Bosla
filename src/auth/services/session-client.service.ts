"use client";

import { AuthClientRepository } from "@/auth/repositories/auth-client.repository";
import { toAuthUser } from "@/auth/utils/to-auth-user";
import type { AuthUser } from "@/auth/types/session";

/**
 * The Client Component counterpart to `session.service.ts` — same
 * responsibility (resolve the current `AuthUser`), different runtime.
 * Presentation-only: guards (`auth/guards/*`, server-side) remain the only
 * source of truth for actually protecting a route.
 */
export const SessionClientService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data } = await AuthClientRepository.getCurrentUser();
    return data.user ? toAuthUser(data.user) : null;
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const { data } = AuthClientRepository.onAuthStateChange((_event, session) => {
      callback(session?.user ? toAuthUser(session.user) : null);
    });
    return data.subscription;
  },
};
