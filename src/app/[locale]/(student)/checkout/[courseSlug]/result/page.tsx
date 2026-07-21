import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SessionService } from "@/auth/services/session.service";
import { PageTitle } from "@/components/admin/PageTitle";
import { PaymentResultPanel } from "@/components/checkout/PaymentResultPanel";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";

/**
 * `/checkout/[courseSlug]/result?orderId=…` — where the provider's
 * hosted checkout sends the browser back. Nothing on this URL is
 * trusted (anyone can type it): `orderId` only tells the panel WHICH
 * order to poll, and `getCheckoutStatusAction` re-checks both the
 * session and webhook-verified DB state on every poll. Course access
 * exists exactly when the server says the order is paid.
 */
export default async function CheckoutResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; locale: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const [{ courseSlug }, { orderId }] = await Promise.all([params, searchParams]);
  const user = await SessionService.getCurrentUser();
  if (!user) return null;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    notFound();
  }

  const t = await getTranslations("Checkout.result");

  // Best-effort, fire-and-forget — this render IS the "customer
  // returned from the provider" signal (docs/payment-platform.md
  // §Timeline). Real access control still lives entirely in
  // `getCheckoutStatusAction`'s own ownership check; this is a log
  // entry, not a data read, so it never blocks the render.
  void recordOrderAuditLog({
    action: "checkout.returned",
    orderId,
    actorType: "user",
    actorId: user.id,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("pageTitle")} description="" />
      <PaymentResultPanel orderId={orderId} courseSlug={courseSlug} />
    </div>
  );
}
