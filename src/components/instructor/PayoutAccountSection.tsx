"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Landmark } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addOwnPayoutAccountAction } from "@/commerce/actions/revenue.actions";
import { SUPPORTED_CURRENCIES } from "@/payments/types/currency";
import type { PayoutAccount } from "@/commerce/types/revenue";

const METHODS = ["bank_transfer", "mobile_wallet", "paypal", "other"] as const;

/** The instructor's "where to pay me" section — declared architecture
 *  only (no transfer provider); an admin reads the default account when
 *  executing a payout batch. */
export function PayoutAccountSection({ accounts }: { accounts: PayoutAccount[] }) {
  const t = useTranslations("Instructor.earnings.payoutAccounts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [method, setMethod] = useState<string>("bank_transfer");
  const [currency, setCurrency] = useState<string>("EGP");
  const [accountName, setAccountName] = useState("");
  const [accountDetails, setAccountDetails] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await addOwnPayoutAccountAction({
        method,
        currency,
        accountName: accountName.trim(),
        accountDetails: accountDetails.trim(),
        isDefault: true,
      });
      if (result.success) {
        toast.success(t("addSuccess"));
        setAdding(false);
        setAccountName("");
        setAccountDetails("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding((open) => !open)}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      </div>

      {accounts.length === 0 && !adding && <p className="text-sm text-muted-foreground">{t("empty")}</p>}

      {accounts.length > 0 && (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Landmark aria-hidden="true" className="size-3.5" />
              </span>
              <span className="font-medium text-foreground">{account.accountName}</span>
              <span className="text-muted-foreground">{t(`methods.${account.method}`)}</span>
              <span className="text-xs text-muted-foreground">{account.currency}</span>
              {account.isDefault && (
                <span className="ms-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t("default")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="account-method">{t("methodLabel")}</Label>
              <Select value={method} onValueChange={(value) => value && setMethod(value)}>
                <SelectTrigger id="account-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`methods.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-currency">{t("currencyLabel")}</Label>
              <Select value={currency} onValueChange={(value) => value && setCurrency(value)}>
                <SelectTrigger id="account-currency">
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
            <Label htmlFor="account-name">{t("nameLabel")}</Label>
            <Input
              id="account-name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-details">{t("detailsLabel")}</Label>
            <Input
              id="account-details"
              value={accountDetails}
              onChange={(event) => setAccountDetails(event.target.value)}
              placeholder={t("detailsPlaceholder")}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">{t("detailsHint")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" disabled={isPending} onClick={submit}>
              {isPending ? t("saving") : t("save")}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setAdding(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
