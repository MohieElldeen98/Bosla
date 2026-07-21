"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getCheckoutStatusAction } from "@/payments/actions/checkout.actions";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes — webhooks normally land in seconds.

type Phase = "verifying" | "paid" | "failed" | "timeout";

/**
 * What the student sees while a payment is being verified. Deliberately
 * trusts NOTHING from any redirect — it polls `getCheckoutStatusAction`
 * (webhook-verified DB state) until the payment resolves, and only a
 * server-confirmed `paid` unlocks the "Go to course" path. A slow
 * webhook degrades to an honest "still verifying" timeout, never a
 * fake success.
 *
 * Two callers, same polling core:
 * - `/checkout/[courseSlug]/result` (no `onCancel`) — the student has
 *   already been redirected back by the provider; "verifying" is a
 *   transient in-flight state before `paid`/`failed`.
 * - `CheckoutFlow` (`onCancel` provided) — the provider checkout opened
 *   in a *new tab* so the student is never stranded on a page with no
 *   way back; this tab polls the same order and offers "cancel and
 *   return" instead of the passive verifying copy.
 */
export function PaymentResultPanel({
  orderId,
  courseSlug,
  onCancel,
}: {
  orderId: string;
  courseSlug: string;
  onCancel?: () => void;
}) {
  const t = useTranslations("Checkout.result");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("verifying");
  const pollCount = useRef(0);

  const poll = useCallback(async (): Promise<Phase | null> => {
    const result = await getCheckoutStatusAction({ orderId });
    if (!result.success) return null;
    if (result.data.outcome === "paid") return "paid";
    if (result.data.outcome === "failed") return "failed";
    return null;
  }, [orderId]);

  useEffect(() => {
    if (phase !== "verifying") return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const resolved = await poll();
      if (cancelled) return;
      if (resolved) {
        setPhase(resolved);
        if (resolved === "paid") {
          router.push(`/courses/${courseSlug}/learn`);
        }
        return;
      }
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        setPhase("timeout");
        return;
      }
      timeout = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timeout = setTimeout(tick, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [phase, poll, router, courseSlug]);

  if (phase === "paid") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">{t("paidTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("paidDescription")}</p>
        </div>
        <Button nativeButton={false} render={<Link href={`/courses/${courseSlug}/learn`} />}>
          {t("goToCourse")}
        </Button>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">{t("failedTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("failedDescription")}</p>
        </div>
        <Button nativeButton={false} variant="outline" render={<Link href={`/checkout/${courseSlug}`} />}>
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Loader2 aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">{t("timeoutTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("timeoutDescription")}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setPhase("verifying")}>
          {t("checkAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center" role="status">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2 aria-hidden="true" className="size-6 animate-spin" />
      </span>
      <div>
        <p className="text-lg font-semibold text-foreground">{t("verifyingTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{onCancel ? t("newTabHint") : t("verifyingDescription")}</p>
      </div>
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancelAndReturn")}
        </Button>
      )}
    </div>
  );
}
