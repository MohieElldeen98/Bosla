/**
 * The full role set (see docs/roles-and-permissions.md §1). Adding a role
 * later — e.g. a future "moderator" — means adding one entry here plus its
 * route-access rule in `auth/constants/routes.ts`; nothing else in this
 * module keys off individual role names.
 */
export const ROLES = ["student", "instructor", "admin", "super_admin"] as const;

export type Role = (typeof ROLES)[number];

/** Assigned to every new sign-up before any Admin/Instructor promotion. */
export const DEFAULT_ROLE: Role = "student";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
