import type { Currency, FXRate, FXRatesResponse } from "./types";
import { BASE_CURRENCY } from "./types";
import { getStaticFxRates } from "./staticProvider";

const ECB_DAILY_RATES_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

const REQUIRED_CURRENCIES: Currency[] = ["EUR", "USD", "SEK", "NOK", "GBP"];

function parseEcbDate(xml: string): string | null {
  const match = xml.match(/<Cube time=['"]([^'"]+)['"]/);
  return match?.[1] ?? null;
}

function parseEcbRates(xml: string): Map<string, number> {
  const rates = new Map<string, number>();
  const pattern = /<Cube currency=['"]([A-Z]{3})['"] rate=['"]([0-9.]+)['"]\/>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    const currency = match[1];
    const eurToCurrency = Number(match[2]);
    if (Number.isFinite(eurToCurrency) && eurToCurrency > 0) {
      rates.set(currency, 1 / eurToCurrency);
    }
  }

  return rates;
}

async function fetchEcbFxRates(): Promise<FXRatesResponse> {
  const response = await fetch(ECB_DAILY_RATES_URL, {
    headers: { Accept: "application/xml,text/xml" },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`ECB FX request failed with ${response.status}`);
  }

  const xml = await response.text();
  const parsedRates = parseEcbRates(xml);
  const ecbDate = parseEcbDate(xml);
  const updatedAt = ecbDate
    ? new Date(`${ecbDate}T15:00:00.000Z`).toISOString()
    : new Date().toISOString();

  const rates: FXRate[] = REQUIRED_CURRENCIES.map((currency) => {
    const rateToEur = currency === BASE_CURRENCY ? 1 : parsedRates.get(currency);
    if (typeof rateToEur !== "number" || !Number.isFinite(rateToEur)) {
      throw new Error(`ECB FX response missing ${currency}`);
    }

    return {
      currency,
      rateToEur,
      source: "live",
      updatedAt,
    };
  });

  return {
    baseCurrency: "EUR",
    rates,
    source: "live",
    updatedAt,
  };
}

export async function getServerFxRates(): Promise<FXRatesResponse> {
  try {
    return await fetchEcbFxRates();
  } catch (err) {
    console.error(
      "[getServerFxRates] ECB request failed, falling back to static FX:",
      err instanceof Error ? err.message : String(err)
    );
    return getStaticFxRates();
  }
}
