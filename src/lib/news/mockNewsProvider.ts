import { mockNews } from "./mockNews";
import type { NewsItem, NewsProvider } from "./types";

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function uniqueTickers(tickers: string[]): Set<string> {
  return new Set(tickers.map(normalizeTicker).filter(Boolean));
}

export function getMockNewsForTickers(tickers: string[]): NewsItem[] {
  const trackedTickers = uniqueTickers(tickers);

  if (trackedTickers.size === 0) {
    return mockNews;
  }

  const matchingNews = mockNews.filter((item) => {
    if (!item.tickers || item.tickers.length === 0) return true;
    return item.tickers.some((ticker) => trackedTickers.has(normalizeTicker(ticker)));
  });

  return matchingNews.length > 0 ? matchingNews : mockNews;
}

export const mockNewsProvider: NewsProvider = {
  async getNews(tickers: string[]): Promise<NewsItem[]> {
    return getMockNewsForTickers(tickers);
  },
};
