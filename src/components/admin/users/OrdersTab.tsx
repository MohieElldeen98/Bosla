import { getTranslations } from "next-intl/server";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderListItem } from "@/commerce/types/order-search";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * The User Details page's Orders tab — real data since Commerce (Phase
 * 5, Step 5.1) now exists, reusing `OrderService.listForStudent`
 * verbatim (the exact same call the Student Dashboard's own Orders &
 * Billing page makes) rather than recomputing anything. Was a permanent
 * Empty-State-only layout before Commerce shipped; now a real table,
 * matching `EnrollmentsTab`'s/`LearningTab`'s shape — no tab-structure
 * redesign was needed, as planned.
 */
export async function OrdersTab({ orders, locale }: { orders: OrderListItem[]; locale: string }) {
  const t = await getTranslations("Admin.users.orders");
  const tOrders = await getTranslations("Admin.orders");

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <EmptyState icon={ShoppingBag} title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tOrders("columns.course")}</TableHead>
            <TableHead>{tOrders("columns.total")}</TableHead>
            <TableHead>{tOrders("columns.status")}</TableHead>
            <TableHead>{tOrders("columns.payment")}</TableHead>
            <TableHead>{tOrders("columns.createdAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium text-foreground">{order.courseTitle}</TableCell>
              <TableCell className="text-muted-foreground">{formatMoney(order.total, order.currency, locale)}</TableCell>
              <TableCell>
                <StatusBadge status={order.status}>{tOrders(`status.${order.status}`)}</StatusBadge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {order.latestPaymentStatus ? tOrders(`paymentStatus.${order.latestPaymentStatus}`) : tOrders("paymentStatus.none")}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(order.createdAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
