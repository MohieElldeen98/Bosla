import type { Role } from "@/auth/types/role";

/**
 * A loose ranking used only for "this role or higher" checks — today, that
 * is exactly one rule: the Student Dashboard is open to any authenticated
 * role (docs/roles-and-permissions.md §3). Instructor/Admin/Super Admin
 * route access is NOT purely rank-based (an Instructor cannot open
 * `/admin`, an Admin cannot open `/instructor`) — those use the explicit
 * allow-lists in `constants/routes.ts` instead.
 */
export const ROLE_RANK: Record<Role, number> = {
  student: 0,
  instructor: 1,
  admin: 2,
  super_admin: 3,
};
