import { getTranslations } from "next-intl/server";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";

/**
 * The User Details page's (Phase 7) Orders tab — Commerce (Orders,
 * Checkout, Coupons, Payments) doesn't exist yet, so this is the
 * permanent tab's *layout*, not a temporary placeholder: once Commerce
 * ships, its Order Service plugs in here and this becomes a real table
 * (mirroring `LearningTab`'s/`EnrollmentsTab`'s table shape) without the
 * page needing a tab-structure redesign. No mock orders, no fabricated
 * payment data.
 */
export async function OrdersTab() {
  const t = await getTranslations("Admin.users.orders");
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <EmptyState icon={ShoppingBag} title={t("emptyTitle")} description={t("emptyDescription")} />
    </div>
  );
}
