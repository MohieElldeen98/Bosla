import type { User } from "@supabase/supabase-js";
import { getRoleFromUser } from "@/lib/auth/get-role-from-user";
import type { AuthUser } from "@/auth/types/session";

/**
 * The one place a Supabase `User` becomes our `AuthUser` — used by
 * `session.service.ts` (Server Components), `hooks/use-session.ts` (Client
 * Components), and `middleware/session.ts` (Edge), so all three surfaces
 * agree on the shape without duplicating the mapping.
 */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    emailVerified: user.email_confirmed_at != null,
    role: getRoleFromUser(user),
  };
}
