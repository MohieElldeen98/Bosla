"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { createCommissionAdjustmentAction } from "@/commerce/actions/revenue.actions";
import { SUPPORTED_CURRENCIES } from "@/payments/types/currency";
import type { InstructorBalanceListItem } from "@/commerce/types/revenue";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/** The balances table + the manual-adjustment form. Adjustments are
 *  signed (a negative amount claws back); every one lands as an
 *  immutable ledger row with the reason recorded. */
export function BalancesManager({ balances }: { balances: InstructorBalanceListItem[] }) {
  const t = useTranslations("Admin.revenue.balances");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adjusting, setAdjusting] = useState<InstructorBalanceListItem | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [reason, setReason] = useState("");

  function openAdjust(balance: InstructorBalanceListItem) {
    setAdjusting(balance);
    setCurrency(balance.currency);
    setAmount("");
    setReason("");
  }

  function submitAdjustment() {
    if (!adjusting) return;
    startTransition(async () => {
      const result = await createCommissionAdjustmentAction({
        instructorId: adjusting.instructorId,
        currency,
        amount: amount.trim(),
        reason: reason.trim(),
      });
      if (result.success) {
        toast.success(t("adjust.success"));
        setAdjusting(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card">
        {balances.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.instructor")}</TableHead>
                <TableHead>{t("columns.pending")}</TableHead>
                <TableHead>{t("columns.available")}</TableHead>
                <TableHead>{t("columns.paid")}</TableHead>
                <TableHead>{t("columns.lifetime")}</TableHead>
                <TableHead>{t("columns.refunds")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{balance.instructorName}</p>
                    <p className="text-xs text-muted-foreground">{balance.currency}</p>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatMoney(balance.pendingBalance, balance.currency, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium text-foreground">
                    {formatMoney(balance.availableBalance, balance.currency, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatMoney(balance.paidBalance, balance.currency, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatMoney(balance.lifetimeEarnings, balance.currency, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatMoney(balance.refundAdjustments, balance.currency, locale)}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openAdjust(balance)}>
                      <SlidersHorizontal aria-hidden="true" />
                      {t("adjust.open")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {adjusting && (
        <div className="max-w-lg space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">
            {t("adjust.title", { name: adjusting.instructorName })}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="adjust-amount">{t("adjust.amountLabel")}</Label>
              <Input
                id="adjust-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="-50.00"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-currency">{t("adjust.currencyLabel")}</Label>
              <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
                <SelectTrigger id="adjust-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">{t("adjust.reasonLabel")}</Label>
            <Input
              id="adjust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("adjust.reasonPlaceholder")}
              disabled={isPending}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" disabled={isPending} onClick={submitAdjustment}>
              {isPending ? t("adjust.saving") : t("adjust.confirm")}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setAdjusting(null)}>
              {t("adjust.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
