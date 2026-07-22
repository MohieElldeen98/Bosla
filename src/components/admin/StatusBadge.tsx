import { Badge } from "@/components/ui/badge";

/** `in_review` added for Course Domain's `course_status` enum (Step 3.2 —
 *  `draft | in_review | published | archived`), matching `outline`'s
 *  existing "awaiting a decision" treatment (same as `pending`).
 *  `active`/`revoked` added for the Enrollment Domain's
 *  `enrollment_status` enum (Step 4.2) — `active` reuses `published`'s
 *  "currently live" treatment, `revoked` reuses `archived`'s.
 *  `suspended`/`deleted` added for the Profile Domain's `profile_status`
 *  enum (Phase 7's Admin User Management) — `suspended` reuses
 *  `revoked`'s "administratively blocked" treatment, `deleted` its own
 *  `secondary` (a soft-deleted account is inert, not "wrong"/alarming
 *  the way a suspension is). `paid`/`cancelled`/`refunded` added for the
 *  Commerce Domain's `order_status` enum (Phase 5, Step 5.1) —
 *  `pending` is already shared, `paid` reuses `published`'s "currently
 *  live/good" treatment, `cancelled` reuses `archived`'s, `refunded`
 *  gets its own `secondary` (a completed reversal, not a moderation
 *  action the way `revoked`/`suspended` are). `approved`/`rejected`
 *  added for the Instructor Domain's `instructor_application_status`
 *  enum (Phase 6, Step 6.1) — `pending` is already shared, `approved`
 *  reuses `published`'s "currently live/good" treatment, `rejected`
 *  reuses `archived`'s. `failed`/`expired` added with the Payment
 *  Platform's extended `order_status` (docs/payment-platform.md), and
 *  `authorized`/`succeeded`/`canceled`/`partially_refunded` for its
 *  `payment_status` enum — success-y states reuse `published`'s
 *  treatment, terminal-bad ones `archived`'s, in-between ones
 *  `outline`/`secondary`. `abandoned` added with the Payment Lifecycle
 *  Hardening work (docs/payment-platform.md §Lifecycle) — reuses
 *  `expired`'s `secondary` treatment: both are dormant, not alarming,
 *  bookkeeping states, not failures. `completed` added for the
 *  background job queue's `job_status` enum (`src/jobs`,
 *  docs/media-platform.md "Background processing") — `pending`/
 *  `processing`/`failed` are already shared, `completed` reuses
 *  `published`'s "currently good" treatment. */
export type AdminStatus =
  | "draft"
  | "published"
  | "pending"
  | "archived"
  | "comingSoon"
  | "in_review"
  | "active"
  | "revoked"
  | "suspended"
  | "deleted"
  | "paid"
  | "cancelled"
  | "refunded"
  | "approved"
  | "rejected"
  | "failed"
  | "expired"
  | "authorized"
  | "succeeded"
  | "canceled"
  | "partially_refunded"
  | "scheduled"
  | "processing"
  | "available"
  | "abandoned"
  | "new"
  | "resolved"
  | "completed";

const STATUS_VARIANT: Record<AdminStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  published: "default",
  pending: "outline",
  archived: "destructive",
  comingSoon: "outline",
  in_review: "outline",
  active: "default",
  revoked: "destructive",
  suspended: "destructive",
  deleted: "secondary",
  paid: "default",
  cancelled: "destructive",
  refunded: "secondary",
  approved: "default",
  rejected: "destructive",
  failed: "destructive",
  expired: "secondary",
  authorized: "outline",
  succeeded: "default",
  canceled: "destructive",
  partially_refunded: "secondary",
  scheduled: "outline",
  processing: "outline",
  available: "default",
  abandoned: "secondary",
  new: "outline",
  resolved: "default",
  completed: "default",
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
