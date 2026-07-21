import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** `/dashboard/orders` now lives at `/me/orders`. */
export default async function OrdersRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/me/orders", locale: locale as Locale });
}
