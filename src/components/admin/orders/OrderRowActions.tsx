"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markOrderPaidAction, cancelOrderAction, refundOrderAction } from "@/commerce/actions/order.actions";
import type { OrderListItem } from "@/commerce/types/order-search";

/**
 * Per-row menu for the admin Orders listing (Phase 5, Step 5.1) — mirrors
 * `EnrollmentRowActions` exactly (View + status-flip actions, toast +
 * `router.refresh()`). Only a `pending` order can be marked paid or
 * cancelled; only a `paid` order can be refunded — `OrderService`'s own
 * mutations re-check this regardless, this just avoids offering a
 * guaranteed-to-fail action in the first place.
 */
export function OrderRowActions({ order }: { order: OrderListItem }) {
  const t = useTranslations("Admin.orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markOrderPaidAction(order.id);
      if (result.success) {
        toast.success(t("toasts.markedPaid"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrderAction(order.id, order.updatedAt);
      if (result.success) {
        toast.success(t("toasts.cancelled"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleRefund() {
    startTransition(async () => {
      const result = await refundOrderAction(order.id, order.updatedAt);
      if (result.success) {
        toast.success(t("toasts.refunded"));
        router.refresh();
      } else if (result.code === "conflict") {
        toast.error(t("toasts.conflict"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label={t("actionsFor", { name: order.studentName })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/admin/orders/${order.id}`)}>
          {t("actions.view")}
        </DropdownMenuItem>
        {order.status === "pending" && (
          <>
            <DropdownMenuItem onClick={handleMarkPaid}>{t("actions.markPaid")}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleCancel}>
              {t("actions.cancel")}
            </DropdownMenuItem>
          </>
        )}
        {order.status === "paid" && (
          <DropdownMenuItem variant="destructive" onClick={handleRefund}>
            {t("actions.refund")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
