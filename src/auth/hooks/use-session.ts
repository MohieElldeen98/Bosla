"use client";

import { useEffect, useState } from "react";
import { SessionClientService } from "@/auth/services/session-client.service";
import type { AuthUser } from "@/auth/types/session";

interface UseSessionResult {
  user: AuthUser | null;
  isLoading: boolean;
}

/**
 * Client-side session read for UI that needs to react to auth state without
 * a full page reload (e.g. a future navbar avatar menu). Guards remain the
 * source of truth for actually protecting a route — this hook is
 * presentation-only. Goes through `session-client.service.ts` →
 * `auth-client.repository.ts`, never touches Supabase directly.
 */
export function useSession(): UseSessionResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SessionClientService.getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    const subscription = SessionClientService.onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  return { user, isLoading };
}
