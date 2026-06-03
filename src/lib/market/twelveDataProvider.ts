import type { Currency } from "@/lib/portfolio/types";
import type { MarketDataResult, MarketQuote } from "./types";

// Twelve Data uses colon notation for non-default exchanges: SYMBOL:EXCHANGE
// Entries here are only for tickers that don't resolve with the bare symbol.
const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
  FORTUM: "FORTUM:HEL",
  WRT1V: "WRT1V:HEL",
  IWDA: "IWDA:AMS",
  "4GLD": "4GLD:XETRA",
  RHM: "RHM:XETRA",
};

// Reverse map: Twelve Data symbol → internal ticker
const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TWELVE_DATA_SYMBOL_MAP).map(([k, v]) => [v, k])
);

function toTdSymbol(ticker: string): string {
  return TWELVE_DATA_SYMBOL_MAP[ticker] ?? ticker;
}

function fromTdSymbol(sym: string): string {
  return REVERSE_MAP[sym] ?? sym;
}

const VALID_CURRENCIES = new Set<string>(["EUR", "USD", "SEK", "NOK", "GBP"]);

function normalizeCurrency(raw: string | undefined): Currency {
  if (raw && VALID_CURRENCIES.has(raw)) return raw as Currency;
  return "USD";
}

function safeFloat(val: string | undefined | null): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  return isFinite(n) ? n : undefined;
}

interface TdRawQuote {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  datetime?: string;
  // Error fields
  code?: number;
  status?: string;
  message?: string;
}

function buildQuote(
  internalTicker: string,
  raw: TdRawQuote
): MarketQuote | null {
  const price = safeFloat(raw.close);
  if (price === undefined) return null;

  return {
    ticker: internalTicker,
    name: raw.name,
    price,
    previousClose: safeFloat(raw.previous_close),
    changeValue: safeFloat(raw.change),
    changePercent: safeFloat(raw.percent_change),
    currency: normalizeCurrency(raw.currency),
    exchange: raw.exchange,
    asOf: raw.datetime
      ? new Date(raw.datetime).toISOString()
      : new Date().toISOString(),
    source: "api",
  };
}

function isErrorResponse(raw: TdRawQuote): boolean {
  return raw.code !== undefined || raw.status === "error";
}

export async function fetchTwelveDataQuotes(
  tickers: string[],
  apiKey: string
): Promise<MarketDataResult> {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()))];

  const tdSymbols = unique.map(toTdSymbol);
  // symbolToInternal maps each Twelve Data symbol back to our ticker name
  const symbolToInternal: Record<string, string> = Object.fromEntries(
    tdSymbols.map((sym, i) => [sym, unique[i]])
  );

  const symbolParam = tdSymbols.join(",");
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolParam)}&apikey=${apiKey}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "InvestmentOS/1.0" },
    // Next.js: disable route-level cache so fresh data is always fetched
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Twelve Data API error: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Twelve Data returned an unexpected response shape");
  }

  const quotes: MarketQuote[] = [];
  const errors: MarketDataResult["errors"] = [];

  if (tdSymbols.length === 1) {
    // Single-symbol request: TD returns the quote object directly
    const sym = tdSymbols[0];
    const raw = data as TdRawQuote;
    const internalTicker = symbolToInternal[sym];

    if (isErrorResponse(raw)) {
      errors.push({
        ticker: internalTicker,
        message: raw.message ?? "Twelve Data: tuntematon virhe",
      });
    } else {
      const quote = buildQuote(internalTicker, raw);
      if (quote) {
        quotes.push(quote);
      } else {
        errors.push({
          ticker: internalTicker,
          message: "Twelve Data: hinta puuttuu vastauksesta",
        });
      }
    }
  } else {
    // Multi-symbol request: TD returns { SYMBOL: quote, ... }
    const map = data as Record<string, TdRawQuote>;

    for (const sym of tdSymbols) {
      const internalTicker = symbolToInternal[sym];
      const raw = map[sym];

      if (!raw || typeof raw !== "object") {
        errors.push({
          ticker: internalTicker,
          message: "Twelve Data: symboli puuttuu vastauksesta",
        });
        continue;
      }

      if (isErrorResponse(raw)) {
        errors.push({
          ticker: internalTicker,
          message: raw.message ?? "Twelve Data: tuntematon virhe",
        });
        continue;
      }

      const quote = buildQuote(internalTicker, raw);
      if (quote) {
        quotes.push(quote);
      } else {
        errors.push({
          ticker: internalTicker,
          message: "Twelve Data: hinta puuttuu vastauksesta",
        });
      }
    }
  }

  return { quotes, errors };
}
