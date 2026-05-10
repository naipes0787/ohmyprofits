import Decimal from 'decimal.js';

/**
 * Money math. Per §3.4: never float-multiply currency values.
 *
 * Rules:
 *   1. All arithmetic goes through Decimal.
 *   2. `formatMoney` is the only function that produces a display string.
 *   3. Inputs from the user are validated by Zod before reaching here.
 */

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

export type Money = Decimal;

export function money(value: number | string | Decimal): Money {
  return new Decimal(value);
}

/** subtotal = Σ(quantity × unit_price) */
export function lineExtended(quantity: number, unitPrice: number | string): Money {
  return new Decimal(unitPrice).mul(quantity);
}

export function applyDiscount(subtotal: Money, percent: number): Money {
  if (!Number.isFinite(percent) || percent <= 0) return subtotal;
  const factor = new Decimal(1).minus(new Decimal(percent).div(100));
  return subtotal.mul(factor);
}

export interface FormatOptions {
  /** ISO 4217 currency code, e.g. "USD". Defaults to USD. */
  currency?: string;
  /** BCP-47 locale tag. Defaults to navigator.language. */
  locale?: string;
}

export function formatMoney(value: Money | number | string, opts: FormatOptions = {}): string {
  const { currency = 'USD', locale } = opts;
  const num = value instanceof Decimal ? value.toNumber() : Number(value);
  return new Intl.NumberFormat(locale ?? navigator.language, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(num);
}
