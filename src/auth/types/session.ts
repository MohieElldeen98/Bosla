import type { Role } from "@/auth/types/role";

/**
 * The authorization-relevant view of "who is logged in" — resolved from the
 * Supabase Auth user, never from our own database (see
 * docs/authentication-architecture.md §4). This is what guards and
 * middleware operate on.
 */
export interface AuthUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  role: Role;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: number | null;
}
