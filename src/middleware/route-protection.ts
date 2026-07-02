import { GUEST_ONLY_PATHS, ROUTE_ACCESS_RULES, SIGN_IN_PATH } from "@/auth/constants/routes";
import { getDefaultRedirectPath, isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

export type RouteDecision =
  | { type: "allow" }
  | { type: "redirect"; path: string; returnTo?: string };

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + "/");
}

/**
 * Pure decision function — no cookies/redirects/Next.js APIs — so it stays
 * trivially testable and is reused unchanged by both middleware (the
 * coarse, fast Edge gate) and, conceptually, layout-level guards
 * (`auth/guards/*`, which apply the same rules via `ROUTE_ACCESS_RULES`).
 *
 * `returnTo` is only set for the "not authenticated, hit a protected route"
 * case — that's the one scenario where "come back here after signing in"
 * is meaningful. Guest-only and wrong-role redirects send the user where
 * they *belong*, not back to where they were.
 */
export function evaluateRouteAccess(input: {
  localeAgnosticPath: string;
  fullPath: string;
  user: AuthUser | null;
}): RouteDecision {
  const { localeAgnosticPath, fullPath, user } = input;

  const isGuestOnly = GUEST_ONLY_PATHS.some((path) => matchesPrefix(localeAgnosticPath, path));
  if (isGuestOnly && user) {
    return { type: "redirect", path: getDefaultRedirectPath(user.role) };
  }

  const rule = ROUTE_ACCESS_RULES.find((r) => matchesPrefix(localeAgnosticPath, r.prefix));
  if (!rule) {
    return { type: "allow" };
  }

  if (!user) {
    return { type: "redirect", path: SIGN_IN_PATH, returnTo: fullPath };
  }
  if (!isRoleAllowed(user.role, rule.roles)) {
    if (rule.onRoleMismatch === "allow") {
      return { type: "allow" };
    }
    return { type: "redirect", path: getDefaultRedirectPath(user.role) };
  }

  return { type: "allow" };
}
