import type { Currency } from "@/lib/portfolio/types";

/**
 * Static FX rates expressing how many EUR one unit of the currency is worth.
 *
 * ⚠️ MVP / static estimates — NOT live rates.
 *
 * Used when the server-side live FX provider is unavailable. In that mode
 * every aggregate figure that mixes currencies is an approximation.
 *
 * Example: 1 USD ≈ 0.92 EUR, 100 SEK ≈ 8.90 EUR.
 */
export const STATIC_FX_RATES_TO_EUR: Record<Currency, number> = {
  EUR: 1,
  USD: 0.92,
  SEK: 0.089,
  NOK: 0.086,
  GBP: 1.17,
};

/** Approximate "as of" label for the static rates (informational only). */
export const STATIC_FX_RATES_AS_OF = "2026-06 (static MVP estimate)";
