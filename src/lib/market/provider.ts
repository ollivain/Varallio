import type { Portfolio, Holding } from "@/lib/portfolio/types";
import type { Watchlist, WatchlistItem } from "@/lib/watchlist/types";
import { MOCK_QUOTES_BY_TICKER } from "./mockMarketData";
import type { MarketDataProvider, MarketDataResult, MarketQuote } from "./types";

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function addPriceVariation(basePrice: number): number {
  const variationFactor = 1 + (Math.random() - 0.5) * 0.008; // ±0.4 %
  return Number((basePrice * variationFactor).toFixed(2));
}

class MockMarketDataProvider implements MarketDataProvider {
  async getQuotes(tickers: string[]): Promise<MarketDataResult> {
    const seen = new Set<string>();
    const quotes: MarketQuote[] = [];
    const errors: MarketDataResult["errors"] = [];
    const asOf = new Date().toISOString();

    for (const raw of tickers) {
      const ticker = normalizeTicker(raw);
      if (seen.has(ticker)) continue;
      seen.add(ticker);

      const base = MOCK_QUOTES_BY_TICKER.get(ticker);
      if (!base) {
        errors.push({ ticker, message: "Ticker ei löydy mock-datasta." });
        continue;
      }

      const price = addPriceVariation(base.price);
      const previousClose = base.previousClose ?? base.price;
      const changeValue = Number((price - previousClose).toFixed(2));
      const changePercent =
        previousClose !== 0
          ? Number(((changeValue / previousClose) * 100).toFixed(4))
          : 0;

      quotes.push({ ...base, price, changeValue, changePercent, asOf });
    }

    return { quotes, errors };
  }
}

export const mockMarketDataProvider: MarketDataProvider = new MockMarketDataProvider();

export const activeMarketDataProvider: MarketDataProvider = mockMarketDataProvider;

// ── Apply helpers ─────────────────────────────────────────────────────────────

export function getUniqueTickersFromPortfolioAndWatchlist(
  portfolio: Portfolio,
  watchlist: Watchlist
): string[] {
  const tickers = new Set<string>();
  for (const h of portfolio.holdings) tickers.add(normalizeTicker(h.ticker));
  for (const i of watchlist.items) tickers.add(normalizeTicker(i.ticker));
  return Array.from(tickers);
}

export function applyQuotesToPortfolio(
  portfolio: Portfolio,
  quotes: MarketQuote[]
): Portfolio {
  const byTicker = new Map(quotes.map((q) => [normalizeTicker(q.ticker), q]));
  let changed = false;

  const holdings = portfolio.holdings.map((h): Holding => {
    const q = byTicker.get(normalizeTicker(h.ticker));
    if (!q) return h;
    changed = true;
    return {
      ...h,
      currentPrice: q.price,
      ...(q.previousClose !== undefined
        ? { previousClosePrice: q.previousClose }
        : {}),
    };
  });

  if (!changed) return portfolio;
  return { ...portfolio, holdings, updatedAt: new Date().toISOString() };
}

export function applyQuotesToWatchlist(
  watchlist: Watchlist,
  quotes: MarketQuote[]
): Watchlist {
  const byTicker = new Map(quotes.map((q) => [normalizeTicker(q.ticker), q]));
  let changed = false;

  const items = watchlist.items.map((item): WatchlistItem => {
    const q = byTicker.get(normalizeTicker(item.ticker));
    if (!q) return item;
    changed = true;
    return {
      ...item,
      currentPrice: q.price,
      ...(q.previousClose !== undefined
        ? { previousClosePrice: q.previousClose }
        : {}),
    };
  });

  if (!changed) return watchlist;
  return { ...watchlist, items, updatedAt: new Date().toISOString() };
}
