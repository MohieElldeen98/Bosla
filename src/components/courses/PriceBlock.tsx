/** Paymob approval hotfix: guest-facing prices always display in EGP,
 *  regardless of a course's stored `currency` — this changes what's shown,
 *  not the stored price value or any business logic. */
function formatPrice(price: string, locale: string): string {
  const amount = Number(price);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "EGP" }).format(amount);
  } catch {
    return `${amount} EGP`;
  }
}

export function PriceBlock({
  price,
  originalPrice,
  isFree,
  locale,
  freeLabel = "Free",
  discountLabel,
  emphasis = "card",
}: {
  price: string;
  originalPrice: string | null;
  /** Unused for display (see `formatPrice`'s Paymob hotfix note) — kept in
   *  the prop type so every existing caller's `currency={course.currency}`
   *  keeps compiling without touching each call site. */
  currency: string;
  isFree: boolean;
  locale: string;
  freeLabel?: string;
  discountLabel?: (percentage: number) => string;
  /** "purchase" scales the price up for the details page's purchase card —
   *  there the price is the decision point, not one meta line among many. */
  emphasis?: "card" | "purchase";
}) {
  const hasDiscount = originalPrice !== null && Number(originalPrice) > Number(price);
  const discount = hasDiscount ? Math.round((1 - Number(price) / Number(originalPrice)) * 100) : 0;
  const priceSize = emphasis === "purchase" ? "text-3xl tracking-tight" : "text-lg";

  if (isFree) {
    return <span className={`${priceSize} font-semibold text-emerald-600 dark:text-emerald-400`}>{freeLabel}</span>;
  }

  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      <span className={`${priceSize} font-semibold`}>{formatPrice(price, locale)}</span>
      {hasDiscount && originalPrice && (
        <>
          <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice, locale)}</span>
          {discountLabel && <span className="text-xs font-semibold text-achievement">{discountLabel(discount)}</span>}
        </>
      )}
    </div>
  );
}
