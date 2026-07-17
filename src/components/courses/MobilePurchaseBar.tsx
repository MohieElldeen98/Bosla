"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PriceBlock } from "@/components/courses/PriceBlock";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobilePurchaseBar({
  price,
  originalPrice,
  currency,
  isFree,
  locale,
  slug,
}: {
  price: string;
  originalPrice: string | null;
  currency: string;
  isFree: boolean;
  locale: string;
  slug: string;
}) {
  const t = useTranslations("CourseCatalog.detail");
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = document.getElementById("purchase-cta");
    if (!target) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 shadow-lg backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <PriceBlock price={price} originalPrice={originalPrice} currency={currency} isFree={isFree} locale={locale} freeLabel={t("free")} />
        <Link href={`/checkout/${slug}`} className={cn(buttonVariants(), "min-h-11 flex-1")}>{isFree ? t("enrollFree") : t("buyNow")}</Link>
      </div>
    </div>
  );
}
