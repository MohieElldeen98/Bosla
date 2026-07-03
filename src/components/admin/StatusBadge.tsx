import { Badge } from "@/components/ui/badge";

/** `in_review` added for Course Domain's `course_status` enum (Step 3.2 —
 *  `draft | in_review | published | archived`), matching `outline`'s
 *  existing "awaiting a decision" treatment (same as `pending`).
 *  `active`/`revoked` added for the Enrollment Domain's
 *  `enrollment_status` enum (Step 4.2) — `active` reuses `published`'s
 *  "currently live" treatment, `revoked` reuses `archived`'s. */
export type AdminStatus =
  | "draft"
  | "published"
  | "pending"
  | "archived"
  | "comingSoon"
  | "in_review"
  | "active"
  | "revoked";

const STATUS_VARIANT: Record<AdminStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  published: "default",
  pending: "outline",
  archived: "destructive",
  comingSoon: "outline",
  in_review: "outline",
  active: "default",
  revoked: "destructive",
};

export function StatusBadge({
  status,
  children,
}: {
  status: AdminStatus;
  children: React.ReactNode;
}) {
  return <Badge variant={STATUS_VARIANT[status]}>{children}</Badge>;
}
