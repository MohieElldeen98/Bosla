import type { Role } from "@/auth/types/role";

/**
 * Locale-agnostic paths — matched after middleware strips the `/en`/`/ar`
 * prefix (see `middleware/matchers.ts`). Guest-only: an already-signed-in
 * visitor is redirected away instead of seeing these forms again.
 *
 * `/reset-password` is deliberately NOT here — a user lands there via a
 * Supabase recovery-email link, which signs them into a real (recovery)
 * session *before* they reach the page. Treating it as guest-only would
 * immediately bounce them away before they could set a new password. It
 * gets its own `requireAuth` guard instead (any session, not "no session")
 * — see `src/app/[locale]/reset-password/page.tsx`.
 */
export const GUEST_ONLY_PATHS = ["/sign-in", "/sign-up", "/forgot-password"] as const;

export const SIGN_IN_PATH = "/sign-in";

/**
 * One entry per protected route group, matched top-to-bottom, first prefix
 * wins. Mirrors docs/roles-and-permissions.md §3 exactly — update both
 * together.
 */
export const ROUTE_ACCESS_RULES: ReadonlyArray<{ prefix: string; roles: Role[] }> = [
  { prefix: "/admin", roles: ["admin", "super_admin"] },
  { prefix: "/instructor", roles: ["instructor"] },
  { prefix: "/dashboard", roles: ["student", "instructor", "admin", "super_admin"] },
];

/**
 * Where a signed-in user lands after sign-in, or is bounced to when they
 * try a route their role doesn't allow.
 */
export const DEFAULT_REDIRECT_BY_ROLE: Record<Role, string> = {
  student: "/dashboard",
  instructor: "/instructor",
  admin: "/admin",
  super_admin: "/admin",
};
