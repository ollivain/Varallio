import { formatCurrency } from "@/lib/formatters";
import type { Currency } from "@/lib/portfolio/types";
import { STATIC_FX_RATES_TO_EUR } from "./rates";
import { BASE_CURRENCY, type FXRateMap, type FXRatesResponse } from "./types";

/**
 * EUR value of one unit of `currency`, using static MVP rates.
 *
 * Safe by design:
 *  - Missing / undefined currency → falls back to 1 (treated as base EUR).
 *  - Unknown currency string → falls back to 1 (never throws).
 */
export function getCurrencyRate(
  currency: Currency | string | undefined,
  rates?: FXRateMap
): number {
  if (!currency) return 1;
  const dynamicRate = rates?.[currency as Currency];
  if (typeof dynamicRate === "number" && Number.isFinite(dynamicRate)) {
    return dynamicRate;
  }

  const rate = STATIC_FX_RATES_TO_EUR[currency as Currency];
  return typeof rate === "number" && Number.isFinite(rate) ? rate : 1;
}

/**
 * Convert an amount in `currency` into the portfolio base currency (EUR).
 *
 * - Non-finite amounts return 0.
 * - Unknown / missing currency is treated as already-base (rate 1) so the app
 *   never crashes and never silently drops a position.
 */
export function convertToBaseCurrency(
  amount: number,
  currency: Currency | string | undefined,
  rates?: FXRateMap
): number {
  if (!Number.isFinite(amount)) return 0;
  return amount * getCurrencyRate(currency, rates);
}

export function fxRatesResponseToMap(response: FXRatesResponse | null | undefined): FXRateMap {
  if (!response) return {};

  return response.rates.reduce<FXRateMap>((map, rate) => {
    if (Number.isFinite(rate.rateToEur)) {
      map[rate.currency] = rate.rateToEur;
    }
    return map;
  }, {});
}

/** Format an EUR (base-currency) amount for display. */
export function formatMoneyBase(
  amount: number,
  options: { decimals?: number } = {}
): string {
  return formatCurrency(amount, { currency: BASE_CURRENCY, decimals: options.decimals ?? 0 });
}
