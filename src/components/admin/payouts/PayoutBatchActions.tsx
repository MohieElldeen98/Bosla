"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarClock, Play, CheckCircle2, XCircle, Ban } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { transitionPayoutBatchAction } from "@/commerce/actions/revenue.actions";
import type { PayoutBatch } from "@/commerce/types/revenue";

type Action = "schedule" | "process" | "mark_paid" | "mark_failed" | "cancel";

/** Lifecycle buttons for one batch — only the transitions legal from
 *  its current status render; the service re-validates regardless.
 *  `mark_failed`/`cancel` restore every swept allocation and balance. */
export function PayoutBatchActions({ batch }: { batch: PayoutBatch }) {
  const t = useTranslations("Admin.payouts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: Action) {
    startTransition(async () => {
      const failureReason =
        action === "mark_failed" ? (window.prompt(t("failReasonPrompt")) ?? undefined) : undefined;
      const result = await transitionPayoutBatchAction({ batchId: batch.id, action, failureReason });
      if (result.success) {
        toast.success(t(`toasts.${action}`));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const status = batch.status;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "pending" && (
        <Button type="button" variant="outline" disabled={isPending} onClick={() => run("schedule")}>
          <CalendarClock aria-hidden="true" />
          {t("actions.schedule")}
        </Button>
      )}
      {(status === "pending" || status === "scheduled") && (
        <>
          <Button type="button" disabled={isPending} onClick={() => run("process")}>
            <Play aria-hidden="true" />
            {t("actions.process")}
          </Button>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => run("cancel")}>
            <Ban aria-hidden="true" />
            {t("actions.cancel")}
          </Button>
        </>
      )}
      {status === "processing" && (
        <>
          <Button type="button" disabled={isPending} onClick={() => run("mark_paid")}>
            <CheckCircle2 aria-hidden="true" />
            {t("actions.markPaid")}
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={() => run("mark_failed")}>
            <XCircle aria-hidden="true" />
            {t("actions.markFailed")}
          </Button>
        </>
      )}
    </div>
  );
}
