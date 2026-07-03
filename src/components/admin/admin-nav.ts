import {
  LayoutDashboard,
  LayoutTemplate,
  Compass as NavigationIcon,
  PanelBottom,
  Image as ImageIcon,
  Search,
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  Tags,
  MessageSquareQuote,
  HelpCircle,
  Settings,
  ScrollText,
  Receipt,
  Ticket,
  type LucideIcon,
} from "lucide-react";

/**
 * The fixed Admin Panel navigation registry — one entry per `/admin/*`
 * page. Labels/descriptions are translated (`Admin.nav.<id>` in
 * `messages/*.json`), not stored here, so this stays the single source of
 * truth Sidebar/Breadcrumb/AdminPlaceholderPage all read from without
 * duplicating copy. `superAdminOnly` items are hidden from plain Admins in
 * the sidebar and additionally guarded at the page level (redirect, not
 * Forbidden — see docs/roles-and-permissions.md §3).
 */
export interface AdminNavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: "dashboard", href: "/admin", icon: LayoutDashboard },
  { id: "homepage", href: "/admin/homepage", icon: LayoutTemplate },
  { id: "navigation", href: "/admin/navigation", icon: NavigationIcon },
  { id: "footer", href: "/admin/footer", icon: PanelBottom },
  { id: "media", href: "/admin/media", icon: ImageIcon },
  { id: "seo", href: "/admin/seo", icon: Search },
  { id: "users", href: "/admin/users", icon: Users, superAdminOnly: true },
  { id: "instructors", href: "/admin/instructors", icon: GraduationCap },
  { id: "courses", href: "/admin/courses", icon: BookOpen },
  { id: "enrollments", href: "/admin/enrollments", icon: UserCheck },
  { id: "orders", href: "/admin/orders", icon: Receipt },
  { id: "coupons", href: "/admin/coupons", icon: Ticket },
  { id: "categories", href: "/admin/categories", icon: Tags },
  { id: "testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
  { id: "faq", href: "/admin/faq", icon: HelpCircle },
  { id: "settings", href: "/admin/settings", icon: Settings, superAdminOnly: true },
  { id: "audit", href: "/admin/audit", icon: ScrollText },
];

export function findAdminNavItemByHref(pathname: string): AdminNavItem | undefined {
  if (pathname === "/admin") {
    return ADMIN_NAV_ITEMS[0];
  }
  return ADMIN_NAV_ITEMS.find((item) => item.href !== "/admin" && pathname.startsWith(item.href));
}
