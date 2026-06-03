import { mockNewsProvider } from "./mockNewsProvider";
import { fetchMarketauxNews } from "./marketauxProvider";
import type { NewsProviderResult } from "./types";

export async function getServerNews(tickers: string[]): Promise<NewsProviderResult> {
  const apiKey = process.env.MARKETAUX_API_KEY;

  if (apiKey) {
    try {
      const liveItems = await fetchMarketauxNews(tickers, apiKey);

      if (liveItems.length > 0) {
        return { items: liveItems, source: "live" };
      }

      console.error("[getServerNews] Marketaux returned no news, falling back to mock.");
    } catch (err) {
      console.error(
        "[getServerNews] Marketaux request failed, falling back to mock:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const mockItems = await mockNewsProvider.getNews(tickers);
  return { items: mockItems, source: "mock" };
}
