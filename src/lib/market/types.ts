import type { Currency } from "@/lib/portfolio/types";

export type MarketInstrumentType =
  | "stock"
  | "etf"
  | "crypto"
  | "commodity"
  | "currency"
  | "index"
  | "other";

export interface MarketQuote {
  ticker: string;
  name?: string;
  price: number;
  previousClose?: number;
  changeValue?: number;
  changePercent?: number;
  currency: Currency;
  exchange?: string;
  asOf: string;
  source: "mock" | "api";
}

export interface MarketDataError {
  ticker: string;
  message: string;
}

export interface MarketDataResult {
  quotes: MarketQuote[];
  errors: MarketDataError[];
}

export interface MarketDataProvider {
  getQuotes(tickers: string[]): Promise<MarketDataResult>;
}
