import { Badge } from "@/components/ui/badge";

export type AdminStatus = "draft" | "published" | "pending" | "archived" | "comingSoon";

const STATUS_VARIANT: Record<AdminStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  published: "default",
  pending: "outline",
  archived: "destructive",
  comingSoon: "outline",
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
