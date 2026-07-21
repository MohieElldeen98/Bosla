"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, CircleOff } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CourseCombobox } from "@/components/admin/users/CourseCombobox";
import { closeCommissionRuleAction, createCommissionRuleAction } from "@/commerce/actions/revenue.actions";
import { COMMISSION_RATE_TYPES, COMMISSION_RULE_SCOPES } from "@/commerce/types/revenue";
import type { CommissionRuleListItem } from "@/commerce/commissions/commission.service";
import type { CommissionRateType, CommissionRuleScope } from "@/commerce/types/revenue";

interface Option {
  value: string;
  label: string;
}

/** Rules table + "new rule" form. A rule is never edited — closing it
 *  ends its window; creating one supersedes the open rule on the same
 *  target. Old sales keep the rule that priced them. */
export function CommissionRulesManager({
  rules,
  courses,
  instructors,
}: {
  rules: CommissionRuleListItem[];
  courses: Option[];
  instructors: Option[];
}) {
  const t = useTranslations("Admin.commissionRules");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<CommissionRuleScope>("global");
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [rateType, setRateType] = useState<CommissionRateType>("percentage");
  const [rateValue, setRateValue] = useState("70");

  const scopeOptions = scope === "course" ? courses : instructors;

  function submitCreate() {
    startTransition(async () => {
      const result = await createCommissionRuleAction({
        scope,
        scopeId: scope === "global" ? null : scopeId,
        rateType,
        rateValue: Number(rateValue),
      });
      if (result.success) {
        toast.success(t("create.success"));
        setCreating(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function closeRule(rule: CommissionRuleListItem) {
    startTransition(async () => {
      const result = await closeCommissionRuleAction({ id: rule.id, expectedUpdatedAt: rule.updatedAt });
      if (result.success) {
        toast.success(t("close.success"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreating((open) => !open)}>
          <Plus aria-hidden="true" />
          {t("create.open")}
        </Button>
      </div>

      {creating && (
        <div className="max-w-2xl space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">{t("create.title")}</p>
          <p className="text-xs text-muted-foreground">{t("create.hint")}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="rule-scope">{t("fields.scope")}</Label>
              <Select
                value={scope}
                onValueChange={(value) => {
                  setScope(value as CommissionRuleScope);
                  setScopeId(null);
                }}
              >
                <SelectTrigger id="rule-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_RULE_SCOPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`scope.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-rate-type">{t("fields.rateType")}</Label>
              <Select value={rateType} onValueChange={(value) => setRateType(value as CommissionRateType)}>
                <SelectTrigger id="rule-rate-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_RATE_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`rateType.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-rate-value">{t("fields.rateValue")}</Label>
              <Input
                id="rule-rate-value"
                inputMode="decimal"
                value={rateValue}
                onChange={(event) => setRateValue(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          {scope !== "global" && (
            <div className="space-y-1.5">
              <Label htmlFor="rule-scope-id">
                {scope === "course" ? t("fields.courseTarget") : t("fields.instructorTarget")}
              </Label>
              <CourseCombobox
                options={scopeOptions}
                value={scopeId}
                onValueChange={setScopeId}
                placeholder={t("fields.scopeTargetPlaceholder")}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" disabled={isPending} onClick={submitCreate}>
              {isPending ? t("create.saving") : t("create.confirm")}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setCreating(false)}>
              {t("create.cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card">
        {rules.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.scope")}</TableHead>
                <TableHead>{t("columns.rate")}</TableHead>
                <TableHead>{t("columns.effective")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{rule.scopeLabel}</p>
                    <p className="text-xs text-muted-foreground">{t(`scope.${rule.scope}`)}</p>
                  </TableCell>
                  <TableCell className="tabular-nums text-foreground">
                    {rule.rateType === "percentage" ? `${rule.rateValue}%` : rule.rateValue}
                    <span className="ms-1 text-xs text-muted-foreground">{t(`rateType.${rule.rateType}`)}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(rule.effectiveFrom))}
                    {" → "}
                    {rule.effectiveTo
                      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(rule.effectiveTo))
                      : t("openEnded")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rule.isActive ? "active" : "archived"}>
                      {rule.isActive ? t("active") : t("closed")}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    {rule.effectiveTo === null && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => closeRule(rule)}
                      >
                        <CircleOff aria-hidden="true" />
                        {t("close.action")}
                      </Button>
                    )}
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
