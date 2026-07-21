/** Currencies checkout accepts today — adding one is a config edit here
 *  (plus enabling it with the active provider), never a schema change:
 *  `orders.currency`/`payments.currency` are plain text. */
export const SUPPORTED_CURRENCIES = ["EGP", "USD", "SAR", "AED"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Minor units per major unit — providers (Paymob included) charge in
 *  the smallest denomination ("cents"). All four launch currencies use
 *  2 decimal places; a future zero-decimal currency (JPY, KWD's 3…)
 *  is one entry here. */
const MINOR_UNIT_EXPONENT: Record<string, number> = {
  EGP: 2,
  USD: 2,
  SAR: 2,
  AED: 2,
};

export function isSupportedCurrency(currency: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(currency.toUpperCase());
}

/** "199.99" EGP → 19999 piasters. Throws on NaN — a malformed amount
 *  must never silently become a 0-cost charge. */
export function toMinorUnits(amount: string, currency: string): number {
  const exponent = MINOR_UNIT_EXPONENT[currency.toUpperCase()] ?? 2;
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid money amount "${amount}"`);
  }
  return Math.round(value * 10 ** exponent);
}

/** 19999 piasters → "199.99". */
export function fromMinorUnits(minor: number, currency: string): string {
  const exponent = MINOR_UNIT_EXPONENT[currency.toUpperCase()] ?? 2;
  return (minor / 10 ** exponent).toFixed(exponent);
}
