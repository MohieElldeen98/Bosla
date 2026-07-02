import { AuthRepository } from "@/auth/repositories/auth.repository";
import { toAuthUser } from "@/auth/utils/to-auth-user";
import type { AuthUser } from "@/auth/types/session";

/**
 * The only auth-state read guards need. Deliberately does not touch
 * ProfileRepository — role comes from the Supabase session JWT (see
 * `lib/auth/get-role-from-user.ts`), so route protection works from a
 * single fast call regardless of the `profiles` table's availability.
 */
export const SessionService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const user = await AuthRepository.getCurrentUser();
    return user ? toAuthUser(user) : null;
  },
};
