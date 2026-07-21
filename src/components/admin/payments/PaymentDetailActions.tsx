"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Undo2, Download, Ban } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { refundPaymentAction, capturePaymentAction, voidPaymentAction } from "@/payments/actions/payment.actions";
import type { PaymentListItem } from "@/payments/types/payment-search";

/**
 * The payment detail's money operations — refund (full/partial with an
 * inline amount+reason form), capture, void. Each button only renders
 * when the payment's state AND the owning provider's capabilities allow
 * it (`PaymentService` re-checks both regardless).
 */
export function PaymentDetailActions({
  payment,
  capabilities,
}: {
  payment: PaymentListItem;
  capabilities: { refund: boolean; partialRefund: boolean; capture: boolean; void: boolean };
}) {
  const t = useTranslations("Admin.payments");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refundOpen, setRefundOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const refundable = (Number(payment.amount) - Number(payment.refundedAmount)).toFixed(2);
  const canRefund =
    capabilities.refund && (payment.status === "succeeded" || payment.status === "partially_refunded");
  const canCapture = capabilities.capture && payment.status === "authorized";
  const canVoid = capabilities.void && payment.status === "authorized";

  function handleRefund() {
    startTransition(async () => {
      const result = await refundPaymentAction({
        paymentId: payment.id,
        amount: amount.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      if (result.success) {
        toast.success(t("toasts.refunded"));
        setRefundOpen(false);
        setAmount("");
        setReason("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleCapture() {
    startTransition(async () => {
      const result = await capturePaymentAction({ paymentId: payment.id });
      if (result.success) {
        toast.success(t("toasts.captured"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleVoid() {
    startTransition(async () => {
      const result = await voidPaymentAction({ paymentId: payment.id });
      if (result.success) {
        toast.success(t("toasts.voided"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (!canRefund && !canCapture && !canVoid) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canRefund && (
          <Button type="button" variant="outline" disabled={isPending} onClick={() => setRefundOpen((open) => !open)}>
            <Undo2 aria-hidden="true" />
            {t("actions.refund")}
          </Button>
        )}
        {canCapture && (
          <Button type="button" disabled={isPending} onClick={handleCapture}>
            <Download aria-hidden="true" />
            {t("actions.capture")}
          </Button>
        )}
        {canVoid && (
          <Button type="button" variant="outline" disabled={isPending} onClick={handleVoid}>
            <Ban aria-hidden="true" />
            {t("actions.void")}
          </Button>
        )}
      </div>

      {refundOpen && canRefund && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">{t("refund.amountLabel", { max: refundable, currency: payment.currency })}</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={refundable}
              disabled={isPending || !capabilities.partialRefund}
            />
            {!capabilities.partialRefund && (
              <p className="text-xs text-muted-foreground">{t("refund.fullOnly")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-reason">{t("refund.reasonLabel")}</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("refund.reasonPlaceholder")}
              disabled={isPending}
            />
          </div>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleRefund}>
            {isPending ? t("refund.processing") : t("refund.confirm")}
          </Button>
        </div>
      )}
    </div>
  );
}
