import type { MarketQuote } from "./types";

type BaseQuote = Omit<MarketQuote, "asOf" | "changeValue" | "changePercent">;

const BASE_QUOTES: BaseQuote[] = [
  {
    ticker: "NVDA",
    name: "NVIDIA",
    price: 975.3,
    previousClose: 940.0,
    currency: "EUR",
    exchange: "NASDAQ",
    source: "mock",
  },
  {
    ticker: "ASML",
    name: "ASML",
    price: 852.2,
    previousClose: 830.0,
    currency: "EUR",
    exchange: "Euronext Amsterdam",
    source: "mock",
  },
  {
    ticker: "FORTUM",
    name: "Fortum",
    price: 17.46,
    previousClose: 17.67,
    currency: "EUR",
    exchange: "Nasdaq Helsinki",
    source: "mock",
  },
  {
    ticker: "WRT1V",
    name: "Wärtsilä",
    price: 15.92,
    previousClose: 15.74,
    currency: "EUR",
    exchange: "Nasdaq Helsinki",
    source: "mock",
  },
  {
    ticker: "IWDA",
    name: "iShares Core MSCI World",
    price: 102.5,
    previousClose: 101.05,
    currency: "EUR",
    exchange: "Euronext Amsterdam",
    source: "mock",
  },
  {
    ticker: "4GLD",
    name: "Xetra-Gold",
    price: 92.3,
    previousClose: 91.9,
    currency: "EUR",
    exchange: "Xetra",
    source: "mock",
  },
  {
    ticker: "NVO",
    name: "Novo Nordisk",
    price: 142.3,
    previousClose: 140.1,
    currency: "USD",
    exchange: "NYSE",
    source: "mock",
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    price: 431.2,
    previousClose: 427.85,
    currency: "USD",
    exchange: "NASDAQ",
    source: "mock",
  },
  {
    ticker: "RHM",
    name: "Rheinmetall",
    price: 521.4,
    previousClose: 511.2,
    currency: "EUR",
    exchange: "Xetra",
    source: "mock",
  },
];

export const MOCK_QUOTES_BY_TICKER: ReadonlyMap<string, BaseQuote> = new Map(
  BASE_QUOTES.map((q) => [q.ticker.toUpperCase(), q])
);
