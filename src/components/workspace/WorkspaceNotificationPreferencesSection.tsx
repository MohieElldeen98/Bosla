"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { updateMyNotificationPreferencesAction } from "@/notifications/actions/notification.actions";
import type { UpdateNotificationPreferencesInput } from "@/notifications/types/notification-preferences";

/** `/me/settings`'s notification toggles — optimistic flip with
 *  rollback on failure, the same pattern `BlogSettingsToggle` already
 *  established. Each flip sends the FULL set of three toggles (the
 *  action requires all three together — one save, not a per-field
 *  patch), the client just always has the current values of all three
 *  in state. `system`-type notifications have no toggle — they're
 *  never suppressed (see `notification.service.ts`'s doc comment). */
export function WorkspaceNotificationPreferencesSection({
  initial,
}: {
  initial: UpdateNotificationPreferencesInput;
}) {
  const t = useTranslations("Me.settings.notifications");
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: keyof UpdateNotificationPreferencesInput, next: boolean) {
    const previous = values;
    const updated = { ...values, [key]: next };
    setValues(updated);
    startTransition(async () => {
      const result = await updateMyNotificationPreferencesAction(updated);
      if (!result.success) {
        setValues(previous);
        toast.error(result.message);
      }
    });
  }

  const rows: { key: keyof UpdateNotificationPreferencesInput; label: string; hint: string }[] = [
    { key: "learningUpdates", label: t("learningUpdates"), hint: t("learningUpdatesHint") },
    { key: "ordersAndPayments", label: t("ordersAndPayments"), hint: t("ordersAndPaymentsHint") },
    {
      key: "courseAndInstructorUpdates",
      label: t("courseAndInstructorUpdates"),
      hint: t("courseAndInstructorUpdatesHint"),
    },
  ];

  return (
    <Card className="space-y-4 p-5">
      <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor={`notif-${row.key}`} className="cursor-pointer">
                {row.label}
              </Label>
              <p className="text-xs text-muted-foreground">{row.hint}</p>
            </div>
            <Switch
              id={`notif-${row.key}`}
              checked={values[row.key]}
              onCheckedChange={(next) => handleToggle(row.key, next)}
              disabled={isPending}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
