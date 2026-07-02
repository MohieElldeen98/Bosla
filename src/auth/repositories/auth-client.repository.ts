"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * The browser-side counterpart to `auth.repository.ts`. Split out because
 * `onAuthStateChange` is inherently a Client Component concern (a live
 * event subscription) and the server repository's `createClient` (from
 * `lib/supabase/server`) depends on `next/headers`, which cannot run in a
 * Client Component. Exists so `hooks/use-session.ts` never imports
 * `lib/supabase/client` or calls the Supabase SDK itself — it goes through
 * `session-client.service.ts`, which goes through this, same as every
 * server-side path goes through `auth.repository.ts`.
 */
export const AuthClientRepository = {
  getCurrentUser() {
    const supabase = createClient();
    return supabase.auth.getUser();
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const supabase = createClient();
    return supabase.auth.onAuthStateChange(callback);
  },

  signOut() {
    const supabase = createClient();
    return supabase.auth.signOut();
  },
};
