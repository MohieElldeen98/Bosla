import "server-only";
import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * The Supabase Admin client — authenticated with the service-role key,
 * which bypasses Row Level Security and can read/write any `auth.users`
 * record via the Admin API. This is the one credential in the app that
 * must never even risk reaching a client bundle, so this module starts
 * with `import "server-only"`: any accidental client-side import becomes a
 * build-time error instead of a silently-`undefined` env var.
 *
 * Deliberately kept out of `lib/env.ts` (imported by `lib/supabase/
 * client.ts`, a browser-bundled file) so the service-role key is never
 * even loaded into a module client code touches.
 *
 * Only `UserRoleAdminRepository` (`src/auth/repositories/
 * user-role-admin.repository.ts`) should call this — every other
 * server-side Supabase need already has its own correctly-scoped client
 * (`lib/supabase/server.ts`, session-cookie-scoped, subject to RLS).
 */
export function createAdminClient(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    logger.warn(
      "[env] Missing SUPABASE_SERVICE_ROLE_KEY — admin-only operations (role changes) will fail closed until this is set.",
    );
    return null;
  }
  if (!env) {
    return null;
  }

  return createSupabaseAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
