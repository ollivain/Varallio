import { mockMarketDataProvider } from "./provider";
import { fetchTwelveDataQuotes } from "./twelveDataProvider";
import type { MarketDataResult } from "./types";

type ServerMarketDataResult = MarketDataResult & { source: "api" | "mock" };

/**
 * Server-side entry point for market data.
 *
 * Priority order:
 *  1. Twelve Data (when MARKET_DATA_API_KEY is set and the call succeeds)
 *  2. Mock provider (fallback in all other cases)
 *
 * Partial failures (some tickers missing) are returned as-is with an errors
 * list. Full failure falls back to mock so the route never crashes.
 */
export async function getServerMarketQuotes(
  tickers: string[]
): Promise<ServerMarketDataResult> {
  const apiKey = process.env.MARKET_DATA_API_KEY;

  if (apiKey) {
    try {
      const result = await fetchTwelveDataQuotes(tickers, apiKey);

      // At least one quote must be returned for the API path to be used.
      if (result.quotes.length > 0) {
        return { ...result, source: "api" };
      }

      // All tickers failed — treat as a full failure and fall through to mock.
      console.error(
        "[getServerMarketQuotes] Twelve Data returned no quotes, falling back to mock. Errors:",
        result.errors
      );
    } catch (err) {
      console.error(
        "[getServerMarketQuotes] Twelve Data request failed, falling back to mock:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const result = await mockMarketDataProvider.getQuotes(tickers);
  return { ...result, source: "mock" };
}
