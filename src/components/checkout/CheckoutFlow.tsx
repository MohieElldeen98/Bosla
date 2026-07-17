"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Tag } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { checkoutAction } from "@/commerce/actions/checkout.actions";
import { simulatePaymentSuccessAction, simulatePaymentFailureAction } from "@/commerce/actions/payment.actions";
import type { CheckoutResult } from "@/commerce/services/order.service";

type Step = "review" | "payment" | "success" | "failed";

function formatMoney(amount: string, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * The real Checkout flow (Step 5.1) — order summary + coupon, "Place
 * Order," then either an immediate success (free/fully-discounted) or a
 * "Simulate Payment" step (`ManualPaymentGateway` — no real provider
 * exists yet, so this stands in for what a gateway redirect + webhook
 * would otherwise do). A single client component drives all four
 * states rather than four separate routes, since none of this needs to
 * be independently linkable — the checkout page itself is the whole
 * flow.
 */
export function CheckoutFlow({
  courseId,
  courseSlug,
  courseTitle,
  price,
  currency,
  locale,
}: {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  price: string;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("review");
  const [couponCode, setCouponCode] = useState("");
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePlaceOrder() {
    setError(null);
    startTransition(async () => {
      const result = await checkoutAction({ courseId, couponCode: couponCode.trim() || undefined });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setCheckout(result.data);
      if (result.data.paymentIntent === null) {
        // Zero-total order: enrollment is already active — hand the
        // student straight to the player; the success panel is only the
        // brief in-flight state while navigation happens.
        setStep("success");
        toast.success(t("success.welcomeToast"));
        router.push(`/courses/${courseSlug}/learn`);
      } else {
        setStep("payment");
      }
    });
  }

  function handleSimulate(outcome: "success" | "failure") {
    if (!checkout?.paymentIntent) return;
    setError(null);
    startTransition(async () => {
      const action = outcome === "success" ? simulatePaymentSuccessAction : simulatePaymentFailureAction;
      const result = await action({ paymentIntentId: checkout.paymentIntent!.id });
      if (!result.success) {
        setError(result.message);
        return;
      }
      if (outcome === "success") {
        setStep("success");
        toast.success(t("success.welcomeToast"));
        router.push(`/courses/${courseSlug}/learn`);
      } else {
        toast.error(t("payment.simulatedFailureToast"));
        setStep("failed");
      }
    });
  }

  function handleRetry() {
    setStep("review");
    setCheckout(null);
    setError(null);
  }

  if (step === "success") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">{t("success.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("success.description", { course: courseTitle })}</p>
        </div>
        <Button nativeButton={false} render={<Link href={`/courses/${courseSlug}/learn`} />}>
          {t("success.goToCourse")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <span className="text-sm text-muted-foreground">{t("summary.total")}</span>
        <span className="text-xl font-semibold text-foreground">
          {checkout ? formatMoney(checkout.order.total, checkout.order.currency, locale) : formatMoney(price, currency, locale)}
        </span>
      </div>

      {step === "review" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-coupon">{t("summary.couponLabel")}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag aria-hidden="true" className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="checkout-coupon"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder={t("summary.couponPlaceholder")}
                  disabled={isPending}
                  className="ps-8"
                />
              </div>
            </div>
          </div>
          <Button type="button" className="w-full" onClick={handlePlaceOrder} disabled={isPending}>
            {isPending ? t("summary.placingOrder") : t("summary.placeOrder")}
          </Button>
        </>
      )}

      {step === "payment" && checkout && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t("payment.badge")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("payment.description")}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="flex-1" disabled={isPending} onClick={() => handleSimulate("success")}>
              <CheckCircle2 aria-hidden="true" />
              {t("payment.simulateSuccess")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isPending}
              onClick={() => handleSimulate("failure")}
            >
              <XCircle aria-hidden="true" />
              {t("payment.simulateFailure")}
            </Button>
          </div>
        </div>
      )}

      {step === "failed" && (
        <div className="space-y-4 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircle aria-hidden="true" className="size-6" />
          </span>
          <p className="text-sm font-medium text-foreground">{t("payment.failedTitle")}</p>
          <Button type="button" variant="outline" onClick={handleRetry} disabled={isPending}>
            {t("payment.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}
