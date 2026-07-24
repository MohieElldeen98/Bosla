import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AuditDomain } from "@/audit/types/audit-feed";

/**
 * One distinct hue per audit domain. `StatusBadge`'s 6 built-in variants
 * aren't enough to keep 13 domains visually distinguishable at a glance in
 * a dense table, so this reads a custom Tailwind class pair straight into
 * `Badge`'s `className` (it already merges via `cn`/`twMerge`). Purely a
 * presentation lookup — unrelated to any status enum the backend enforces,
 * unlike `StatusBadge`'s `AdminStatus` map.
 */
const AUDIT_DOMAIN_CLASSES: Record<AuditDomain, string> = {
  article: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  media: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  cms: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  course: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  category: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  order: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  coupon: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  instructorProfile: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  learning: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  revenue: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  siteSettings: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  navigation: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400",
  profile: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function AuditDomainBadge({ domain, children }: { domain: AuditDomain; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", AUDIT_DOMAIN_CLASSES[domain])}>
      {children}
    </Badge>
  );
}
