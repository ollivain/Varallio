import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";
import type { NewsItem, NewsRow } from "./types";

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function createTimeLabel(publishedAt: string, now = new Date()): string {
  const publishedDate = new Date(publishedAt);
  const ageMs = now.getTime() - publishedDate.getTime();

  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "nyt";
  }

  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
  if (ageHours < 1) return "nyt";
  if (ageHours < 24) return `${ageHours} h`;

  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays} pv`;
}

export function calculateNewsRows(newsItems: NewsItem[]): NewsRow[] {
  return newsItems.map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source,
    publishedAt: item.publishedAt,
    timeLabel: createTimeLabel(item.publishedAt),
    tickers: item.tickers,
    sentiment: item.sentiment,
    summary: item.summary,
    url: item.url,
    imageUrl: item.imageUrl,
  }));
}

export function sortNewsRows(rows: NewsRow[]): NewsRow[] {
  return [...rows].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function sortNewsItemsByPublishedAt(newsItems: NewsItem[]): NewsItem[] {
  return [...newsItems].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function filterNewsForPortfolioAndWatchlist(
  newsItems: NewsItem[],
  portfolio: Portfolio,
  watchlist: Watchlist
): NewsItem[] {
  const trackedTickers = new Set([
    ...portfolio.holdings.map((holding) => normalizeTicker(holding.ticker)),
    ...watchlist.items.map((item) => normalizeTicker(item.ticker)),
  ]);

  return newsItems.filter((item) => {
    if (!item.tickers || item.tickers.length === 0) return true;
    return item.tickers.some((ticker) => trackedTickers.has(normalizeTicker(ticker)));
  });
}

export function calculateFilteredNewsRows(
  newsItems: NewsItem[],
  portfolio: Portfolio,
  watchlist: Watchlist
): NewsRow[] {
  const filteredItems = filterNewsForPortfolioAndWatchlist(newsItems, portfolio, watchlist);
  return calculateNewsRows(sortNewsItemsByPublishedAt(filteredItems));
}
