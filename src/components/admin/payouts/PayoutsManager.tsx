"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { createPayoutBatchAction } from "@/commerce/actions/revenue.actions";
import { SUPPORTED_CURRENCIES } from "@/payments/types/currency";
import { PAYOUT_STATUSES } from "@/commerce/types/revenue";
import type { PayoutBatch, PayoutStatus } from "@/commerce/types/revenue";

const ALL = "all";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Batch list + creation. Creating a batch sweeps every positive
 *  available balance in the chosen currency into per-instructor items
 *  — the service explains the guarantees. */
export function PayoutsManager({
  batches,
  statusFilter,
}: {
  batches: PayoutBatch[];
  statusFilter?: PayoutStatus;
}) {
  const t = useTranslations("Admin.payouts");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [currency, setCurrency] = useState<string>(SUPPORTED_CURRENCIES[0]);
  const [notes, setNotes] = useState("");

  function updateStatus(value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) next.delete("status");
    else next.set("status", value);
    const query = next.toString();
    router.push(query ? `/admin/payouts?${query}` : "/admin/payouts", { scroll: false });
  }

  function submitCreate() {
    startTransition(async () => {
      const result = await createPayoutBatchAction({ currency, notes: notes.trim() || undefined });
      if (result.success) {
        toast.success(t("create.success"));
        setCreating(false);
        setNotes("");
        router.push(`/admin/payouts/${result.data.id}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={statusFilter ?? ALL} onValueChange={updateStatus}>
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
            {PAYOUT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" onClick={() => setCreating((open) => !open)}>
          <Plus aria-hidden="true" />
          {t("create.open")}
        </Button>
      </div>

      {creating && (
        <div className="max-w-lg space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">{t("create.title")}</p>
          <p className="text-xs text-muted-foreground">{t("create.hint")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="batch-currency">{t("create.currencyLabel")}</Label>
              <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
                <SelectTrigger id="batch-currency">
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
            <div className="space-y-1.5">
              <Label htmlFor="batch-notes">{t("create.notesLabel")}</Label>
              <Input
                id="batch-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t("create.notesPlaceholder")}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" disabled={isPending} onClick={submitCreate}>
              {isPending ? t("create.creating") : t("create.confirm")}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setCreating(false)}>
              {t("create.cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card">
        {batches.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.batch")}</TableHead>
                <TableHead>{t("columns.total")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <p className="font-mono text-xs text-foreground">{batch.id.slice(0, 8)}</p>
                    {batch.notes && <p className="truncate text-xs text-muted-foreground">{batch.notes}</p>}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium text-foreground">
                    {formatMoney(batch.totalAmount, batch.currency, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={batch.status}>{t(`status.${batch.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(batch.createdAt),
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/payouts/${batch.id}`}
                      className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {t("actions.view")}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
