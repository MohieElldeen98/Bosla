"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShieldOff, ShieldCheck } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { setAccountStatusAction } from "@/auth/actions/user-admin.actions";
import type { ProfileStatus } from "@/auth/types/profile-status";

/**
 * The User Details page's (Phase 7) Activate/Suspend control —
 * `ProfileService.setAccountStatus` does the actual authorization
 * (`super_admin`-only) and write; this is presentation + the Server
 * Action call only. `pending`/`archived` accounts show "Activate" too
 * (any non-`active`, non-`deleted` status can be activated) — only
 * `active`/`suspended` are meaningfully mutually exclusive toggle
 * states.
 */
export function AccountStatusActions({ userId, status }: { userId: string; status: ProfileStatus }) {
  const t = useTranslations("Admin.users");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSetStatus(nextStatus: "active" | "suspended") {
    startTransition(async () => {
      const result = await setAccountStatusAction(userId, nextStatus);
      if (result.success) {
        toast.success(nextStatus === "suspended" ? t("toasts.suspended") : t("toasts.activated"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (status === "deleted") {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{t("fields.accountActions")}</p>
      {status === "suspended" ? (
        <Button type="button" variant="outline" disabled={isPending} onClick={() => handleSetStatus("active")}>
          <ShieldCheck aria-hidden="true" />
          {t("actions.activate")}
        </Button>
      ) : (
        <Button type="button" variant="destructive" disabled={isPending} onClick={() => handleSetStatus("suspended")}>
          <ShieldOff aria-hidden="true" />
          {t("actions.suspend")}
        </Button>
      )}
    </div>
  );
}
