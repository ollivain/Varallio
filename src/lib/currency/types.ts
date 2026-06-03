import type { Currency } from "@/lib/portfolio/types";

export type { Currency };

/** The portfolio's reporting / base currency. All aggregate figures are in this. */
export const BASE_CURRENCY: Currency = "EUR";

export type FXRateSource = "live" | "static";

export type FXRateMap = Partial<Record<Currency, number>>;

export interface FXRate {
  currency: Currency;
  rateToEur: number;
  source: FXRateSource;
  updatedAt: string;
}

export interface FXRatesResponse {
  baseCurrency: "EUR";
  rates: FXRate[];
  source: FXRateSource;
  updatedAt: string;
}

/**
 * Whether the FX rates in use are static MVP estimates rather than live rates.
 * Surfaced in the UI and agent prompt so figures are not mistaken for exact.
 */
export const FX_RATES_ARE_STATIC = true;
