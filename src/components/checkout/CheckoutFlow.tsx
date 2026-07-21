"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Tag, CreditCard, ShieldCheck } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceBlock } from "@/components/courses/PriceBlock";
import { PaymentResultPanel } from "@/components/checkout/PaymentResultPanel";
import { abandonCheckoutAction, startCheckoutAction } from "@/payments/actions/checkout.actions";

/**
 * The checkout page's interactive panel — order summary + coupon, then
 * "Continue to payment." A $0 order completes immediately (enrollment
 * is already active when the action returns); a paid one hands the
 * browser to the provider's hosted checkout via `redirectUrl`. The
 * outcome is NEVER read from that redirect — the result page
 * (`/checkout/[courseSlug]/result`) polls the server for the
 * webhook-verified state.
 *
 * The coupon field isn't validated live — `startCheckoutAction` is the
 * only place a code is ever checked (server-verified pricing, per
 * docs/payment-platform.md), so an invalid code surfaces as the same
 * error banner as any other checkout failure rather than a separate
 * inline coupon error.
 */
export function CheckoutFlow({
  courseId,
  courseSlug,
  price,
  originalPrice,
  currency,
  locale,
}: {
  courseId: string;
  courseSlug: string;
  price: string;
  originalPrice: string | null;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("Checkout");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [completedFree, setCompletedFree] = useState(false);
  const [waiting, setWaiting] = useState<{ orderId: string; paymentId: string } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const paymentTabRef = useRef<Window | null>(null);
  const couponInputId = useId();
  const busy = isPending || redirecting;

  function handleContinue() {
    setError(null);
    // Opened synchronously, inside the click handler, so browsers still
    // treat it as a direct user-gesture popup and don't block it — we
    // fill in the real URL once the order/payment session exists below.
    // Paying in a *new tab* keeps this tab (and its "cancel and return")
    // reachable the whole time, since the provider's hosted checkout has
    // no way back to us on its own.
    const tab = window.open("about:blank", "_blank");
    paymentTabRef.current = tab;
    startTransition(async () => {
      const result = await startCheckoutAction({
        courseId,
        couponCode: couponCode.trim() || undefined,
        locale,
      });
      if (!result.success) {
        tab?.close();
        setError(result.message);
        errorRef.current?.focus();
        return;
      }
      if (result.data.kind === "completed") {
        tab?.close();
        setCompletedFree(true);
        toast.success(t("success.welcomeToast"));
        router.push(`/courses/${courseSlug}/learn`);
        return;
      }
      if (result.data.kind === "unavailable") {
        tab?.close();
        setError(result.data.message);
        errorRef.current?.focus();
        return;
      }
      if (tab) {
        tab.location.href = result.data.redirectUrl;
        setWaiting({ orderId: result.data.order.id, paymentId: result.data.paymentId });
        return;
      }
      // Popup blocked: fall back to the old full-page handoff.
      setRedirecting(true);
      window.location.assign(result.data.redirectUrl);
    });
  }

  function handleCancelWaiting() {
    paymentTabRef.current?.close();
    paymentTabRef.current = null;
    if (waiting) {
      // Best-effort — the payment may have already resolved server-side
      // by the time this lands, in which case `CheckoutService.abandon`
      // is a safe no-op. Never blocks the UI from returning to the form.
      void abandonCheckoutAction({ paymentId: waiting.paymentId });
    }
    setWaiting(null);
  }

  if (waiting) {
    return <PaymentResultPanel orderId={waiting.orderId} courseSlug={courseSlug} onCancel={handleCancelWaiting} />;
  }

  if (completedFree) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center" role="status">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <p className="text-lg font-semibold text-foreground">{t("success.title")}</p>
        <Button nativeButton={false} className="w-full" render={<Link href={`/courses/${courseSlug}/learn`} />}>
          {t("success.goToCourse")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-foreground">{t("summary.title")}</h2>

      {error && (
        <p
          ref={errorRef}
          role="alert"
          tabIndex={-1}
          className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive outline-none"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-sm text-muted-foreground">{t("summary.priceLabel")}</span>
        <PriceBlock
          price={price}
          originalPrice={originalPrice}
          currency={currency}
          isFree={Number(price) === 0}
          locale={locale}
          freeLabel={t("summary.free")}
          discountLabel={(percentage) => t("summary.discount", { percentage })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={couponInputId}>{t("summary.couponLabel")}</Label>
        <div className="relative">
          <Tag
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={couponInputId}
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value)}
            placeholder={t("summary.couponPlaceholder")}
            disabled={busy}
            autoComplete="off"
            className="ps-8 uppercase placeholder:normal-case"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("summary.couponHint")}</p>
      </div>

      <LoadingButton type="button" className="w-full" onClick={handleContinue} isLoading={busy}>
        {!busy && <CreditCard aria-hidden="true" />}
        {redirecting ? t("summary.redirecting") : isPending ? t("summary.placingOrder") : t("summary.continueToPayment")}
      </LoadingButton>

      <p aria-live="polite" className="sr-only">
        {redirecting ? t("summary.redirecting") : isPending ? t("summary.placingOrder") : ""}
      </p>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" />
        {t("summary.secureNote")}
      </p>
    </div>
  );
}
