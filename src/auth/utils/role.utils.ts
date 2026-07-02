import { ROLE_RANK } from "@/auth/constants/roles";
import { DEFAULT_REDIRECT_BY_ROLE } from "@/auth/constants/routes";
import type { Role } from "@/auth/types/role";

export function hasMinimumRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isRoleAllowed(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

export function getDefaultRedirectPath(role: Role): string {
  return DEFAULT_REDIRECT_BY_ROLE[role];
}
