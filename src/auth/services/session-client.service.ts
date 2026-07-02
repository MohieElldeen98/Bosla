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

  /**
   * `signOutAction()` (a Server Action) clears the server-side session but
   * has no way to tell the browser's own Supabase client instance to
   * update — so a Client Component subscribed to `onAuthStateChange` (e.g.
   * `useSession()`, used by the public navbar) never hears about it and
   * keeps showing the signed-in state until an unrelated full reload.
   * Calling this too fires that listener immediately. Safe to call
   * alongside `signOutAction()` — signing out twice is a no-op.
   */
  async signOut(): Promise<void> {
    await AuthClientRepository.signOut();
  },
};
