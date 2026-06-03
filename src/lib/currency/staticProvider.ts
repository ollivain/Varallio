import type { Currency, FXRate, FXRatesResponse } from "./types";
import { STATIC_FX_RATES_TO_EUR } from "./rates";

const SUPPORTED_CURRENCIES: Currency[] = ["EUR", "USD", "SEK", "NOK", "GBP"];

export function getStaticFxRates(updatedAt = new Date().toISOString()): FXRatesResponse {
  const rates: FXRate[] = SUPPORTED_CURRENCIES.map((currency) => ({
    currency,
    rateToEur: STATIC_FX_RATES_TO_EUR[currency],
    source: "static",
    updatedAt,
  }));

  return {
    baseCurrency: "EUR",
    rates,
    source: "static",
    updatedAt,
  };
}
