import type { User } from "@supabase/supabase-js";
import { DEFAULT_ROLE, isRole, type Role } from "@/auth/types/role";

/**
 * The `users.role` column (docs/database-overview.md §1) is mirrored into
 * the Supabase Auth user's `app_metadata.role` whenever it changes, so both
 * Edge middleware and Server Components can authorize from the session JWT
 * alone — Edge Runtime cannot reach Postgres directly, and re-fetching the
 * profile row on every request would be a DB round-trip per navigation.
 * `app_metadata` (not `user_metadata`) is used deliberately: it can only be
 * written from a trusted server context (the Supabase service-role key),
 * never by the signed-in user themselves.
 */
export function getRoleFromUser(user: User | null): Role {
  const value = user?.app_metadata?.role;
  return isRole(value) ? value : DEFAULT_ROLE;
}
