/**
 * An `AdminNavItem` (src/components/admin/admin-nav.ts) with its label
 * resolved server-side — resolved once in `AdminShell` and passed down to
 * `Sidebar`/`Breadcrumb` so translation lookup isn't duplicated across
 * client components. Deliberately excludes `icon`: a Lucide icon is a
 * component reference, and Server Components can't pass a bare function
 * reference as a prop to a Client Component (only serializable data or
 * already-rendered JSX) — client components that need the icon look it up
 * from `ADMIN_NAV_ITEMS` themselves by `id` instead. `group`/`comingSoon`
 * are carried through as plain data (no translation needed for
 * `comingSoon`; `group`'s label is resolved separately, once per group,
 * by `AdminShell` into `groupLabel`).
 */
export interface ResolvedAdminNavItem {
  id: string;
  href: string;
  label: string;
  group: string;
  groupLabel: string;
  comingSoon: boolean;
}
