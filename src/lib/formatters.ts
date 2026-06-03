import type { Currency } from "./portfolio/types";

/**
 * Number & money formatting helpers using Finnish / European conventions:
 *   - space as the thousands separator (e.g. 127 540)
 *   - comma as the decimal separator (e.g. 975,30)
 *   - currency symbol after the amount (e.g. 127 540 €)
 */

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  SEK: "kr",
  NOK: "kr",
  GBP: "£",
};

interface CurrencyOptions {
  currency?: Currency;
  decimals?: number;
}

/** Format a raw number in fi-FI locale with a fixed number of decimals. */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("fi-FI", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** e.g. formatCurrency(127540) → "127 540 €", formatCurrency(975.3, { decimals: 2 }) → "975,30 €" */
export function formatCurrency(value: number, options: CurrencyOptions = {}): string {
  const { currency = "EUR", decimals = 0 } = options;
  return `${formatNumber(value, decimals)} ${CURRENCY_SYMBOLS[currency]}`;
}

/** Like {@link formatCurrency} but always shows an explicit + or - sign. e.g. "+2 940 €", "-1 200 €" */
export function formatSignedCurrency(value: number, options: CurrencyOptions = {}): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value), options)}`;
}

/** Expects an already-scaled percentage value (e.g. 2.35 → "2,35%"). */
export function formatPercent(value: number, decimals = 2): string {
  return `${formatNumber(value, decimals)}%`;
}

/** Like {@link formatPercent} but always signed. e.g. 2.35 → "+2,35%", -1.18 → "-1,18%". */
export function formatSignedPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatNumber(Math.abs(value), decimals)}%`;
}
