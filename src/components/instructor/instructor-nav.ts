import { LayoutDashboard, BookOpen, Users, Ticket, Wallet, UserCircle, type LucideIcon } from "lucide-react";

/**
 * The Instructor Panel's navigation registry — mirrors
 * `components/admin/admin-nav.ts`'s exact shape/precedent for the same
 * reason: one source of truth `InstructorSidebar`/`InstructorBreadcrumb`
 * both read from. Unlike the Admin sidebar, every item here is real
 * (no `comingSoon` placeholders) and there's only one grouping level —
 * six items doesn't need section headers the way the Admin Panel's
 * seventeen did.
 */
export interface InstructorNavItem {
  id: "dashboard" | "courses" | "students" | "coupons" | "earnings" | "profile";
  href: string;
  icon: LucideIcon;
}

export const INSTRUCTOR_NAV_ITEMS: InstructorNavItem[] = [
  { id: "dashboard", href: "/instructor", icon: LayoutDashboard },
  { id: "courses", href: "/instructor/courses", icon: BookOpen },
  { id: "students", href: "/instructor/students", icon: Users },
  { id: "coupons", href: "/instructor/coupons", icon: Ticket },
  { id: "earnings", href: "/instructor/earnings", icon: Wallet },
  { id: "profile", href: "/instructor/profile", icon: UserCircle },
];
