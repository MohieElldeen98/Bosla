import {
  LayoutDashboard,
  LayoutTemplate,
  Compass as NavigationIcon,
  Image as ImageIcon,
  Search,
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  Tags,
  MessageSquareQuote,
  Newspaper,
  HelpCircle,
  Settings,
  ScrollText,
  Receipt,
  CreditCard,
  TrendingUp,
  Banknote,
  Percent,
  Ticket,
  Mail,
  FileText,
  ListTodo,
  type LucideIcon,
} from "lucide-react";

/**
 * The sidebar's section groupings — purely a presentation grouping (no
 * access-control meaning), chosen to match how an admin actually thinks
 * about the panel ("where do I manage courses" vs. "where do I edit the
 * homepage") instead of the one long alphabetically-flat list this
 * replaced. `overview` renders with no visible header (it's a single
 * item, a label above it would be noise); every other group gets a
 * small uppercase section label (`Admin.nav.groups.<id>`).
 */
export const ADMIN_NAV_GROUPS = ["overview", "catalog", "commerce", "people", "content", "engagement", "system"] as const;
export type AdminNavGroup = (typeof ADMIN_NAV_GROUPS)[number];

/**
 * The fixed Admin Panel navigation registry — one entry per `/admin/*`
 * page. Labels/descriptions are translated (`Admin.nav.<id>` in
 * `messages/*.json`), not stored here, so this stays the single source of
 * truth Sidebar/Breadcrumb/AdminPlaceholderPage all read from without
 * duplicating copy. `superAdminOnly` items are hidden from plain Admins in
 * the sidebar and additionally guarded at the page level (redirect, not
 * Forbidden — see docs/roles-and-permissions.md §3). `comingSoon` items
 * still link to a real (if placeholder-only) page — `AdminPlaceholderPage`
 * already explains "not built yet" once you're there — but are flagged
 * here so the sidebar itself can visually distinguish them from a fully
 * working section *before* a first-time admin wastes a click finding out.
 */
export interface AdminNavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  group: AdminNavGroup;
  superAdminOnly?: boolean;
  comingSoon?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: "dashboard", href: "/admin", icon: LayoutDashboard, group: "overview" },

  { id: "courses", href: "/admin/courses", icon: BookOpen, group: "catalog" },
  { id: "categories", href: "/admin/categories", icon: Tags, group: "catalog" },
  { id: "instructors", href: "/admin/instructors", icon: GraduationCap, group: "catalog" },
  { id: "enrollments", href: "/admin/enrollments", icon: UserCheck, group: "catalog" },

  { id: "orders", href: "/admin/orders", icon: Receipt, group: "commerce" },
  { id: "payments", href: "/admin/payments", icon: CreditCard, group: "commerce" },
  { id: "revenue", href: "/admin/revenue", icon: TrendingUp, group: "commerce" },
  { id: "payouts", href: "/admin/payouts", icon: Banknote, group: "commerce" },
  { id: "commissionRules", href: "/admin/commission-rules", icon: Percent, group: "commerce" },
  { id: "coupons", href: "/admin/coupons", icon: Ticket, group: "commerce" },

  { id: "users", href: "/admin/users", icon: Users, group: "people", superAdminOnly: true },
  {
    id: "instructorApplications",
    href: "/admin/instructor-applications",
    icon: UserCheck,
    group: "people",
  },

  { id: "homepage", href: "/admin/homepage", icon: LayoutTemplate, group: "content" },
  { id: "articles", href: "/admin/articles", icon: Newspaper, group: "content" },
  { id: "content", href: "/admin/content", icon: FileText, group: "content" },
  { id: "navigation", href: "/admin/navigation", icon: NavigationIcon, group: "content" },
  { id: "media", href: "/admin/media", icon: ImageIcon, group: "content" },
  { id: "seo", href: "/admin/seo", icon: Search, group: "content" },

  { id: "contact", href: "/admin/contact", icon: Mail, group: "engagement" },
  { id: "testimonials", href: "/admin/testimonials", icon: MessageSquareQuote, group: "engagement", comingSoon: true },
  { id: "faq", href: "/admin/faq", icon: HelpCircle, group: "engagement", comingSoon: true },

  { id: "settings", href: "/admin/settings", icon: Settings, group: "system", superAdminOnly: true },
  { id: "jobs", href: "/admin/jobs", icon: ListTodo, group: "system", superAdminOnly: true },
  { id: "audit", href: "/admin/audit", icon: ScrollText, group: "system", comingSoon: true },
];

export function findAdminNavItemByHref(pathname: string): AdminNavItem | undefined {
  if (pathname === "/admin") {
    return ADMIN_NAV_ITEMS[0];
  }
  return ADMIN_NAV_ITEMS.find((item) => item.href !== "/admin" && pathname.startsWith(item.href));
}
