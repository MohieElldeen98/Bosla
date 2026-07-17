function formatPrice(price: string, currency: string, locale: string): string {
  const amount = Number(price);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function PriceBlock({
  price,
  originalPrice,
  currency,
  isFree,
  locale,
  freeLabel = "Free",
  discountLabel,
}: {
  price: string;
  originalPrice: string | null;
  currency: string;
  isFree: boolean;
  locale: string;
  freeLabel?: string;
  discountLabel?: (percentage: number) => string;
}) {
  const hasDiscount = originalPrice !== null && Number(originalPrice) > Number(price);
  const discount = hasDiscount ? Math.round((1 - Number(price) / Number(originalPrice)) * 100) : 0;

  if (isFree) {
    return <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{freeLabel}</span>;
  }

  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      <span className="text-lg font-semibold">{formatPrice(price, currency, locale)}</span>
      {hasDiscount && originalPrice && (
        <>
          <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice, currency, locale)}</span>
          {discountLabel && <span className="text-xs font-medium text-primary">{discountLabel(discount)}</span>}
        </>
      )}
    </div>
  );
}
