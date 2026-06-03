import {
  calculateHoldingValue,
  calculatePortfolioSummary,
} from "@/lib/portfolio/calculations";
import type { Holding, Portfolio } from "@/lib/portfolio/types";
import type { FXRateMap } from "@/lib/currency";
import type { Watchlist } from "@/lib/watchlist";
import { calculateNewsRows } from "./calculations";
import type {
  NewsInsight,
  NewsIntelligenceSummary,
  NewsItem,
  NewsPriority,
  NewsRow,
} from "./types";

const PRIORITY_SCORE: Record<NewsPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function getAgeHours(publishedAt: string, now = new Date()): number | undefined {
  const publishedDate = new Date(publishedAt);
  const ageMs = now.getTime() - publishedDate.getTime();

  if (!Number.isFinite(ageMs) || ageMs < 0) return undefined;
  return ageMs / (1000 * 60 * 60);
}

function getAffectedSymbols(row: NewsRow, trackedTickers: Set<string>): string[] {
  const symbols = (row.tickers ?? []).map(normalizeTicker).filter(Boolean);

  if (symbols.length === 0) {
    return [];
  }

  const matchedSymbols = symbols.filter((ticker) => trackedTickers.has(ticker));
  return [...new Set(matchedSymbols.length > 0 ? matchedSymbols : symbols)];
}

function getTickerCounts(news: NewsItem[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of news) {
    for (const ticker of item.tickers ?? []) {
      const normalizedTicker = normalizeTicker(ticker);
      if (!normalizedTicker) continue;
      counts.set(normalizedTicker, (counts.get(normalizedTicker) ?? 0) + 1);
    }
  }

  return counts;
}

function getHoldingMaps(portfolio: Portfolio, rates?: FXRateMap) {
  const totalValue = calculatePortfolioSummary(portfolio, rates).totalValue;
  const holdingByTicker = new Map<string, Holding>();
  const holdingWeightByTicker = new Map<string, number>();
  const holdingValueByTicker = new Map<string, number>();

  for (const holding of portfolio.holdings) {
    const ticker = normalizeTicker(holding.ticker);
    const value = calculateHoldingValue(holding, rates);
    holdingByTicker.set(ticker, holding);
    holdingValueByTicker.set(ticker, value);
    holdingWeightByTicker.set(ticker, totalValue !== 0 ? (value / totalValue) * 100 : 0);
  }

  return { holdingByTicker, holdingValueByTicker, holdingWeightByTicker };
}

function getHighestHoldingExposure(
  affectedSymbols: string[],
  holdingValueByTicker: Map<string, number>,
  holdingWeightByTicker: Map<string, number>
) {
  let relatedHoldingValue: number | undefined;
  let relatedHoldingWeight: number | undefined;

  for (const ticker of affectedSymbols) {
    const weight = holdingWeightByTicker.get(ticker);
    if (weight === undefined) continue;

    if (relatedHoldingWeight === undefined || weight > relatedHoldingWeight) {
      relatedHoldingWeight = weight;
      relatedHoldingValue = holdingValueByTicker.get(ticker);
    }
  }

  return { relatedHoldingValue, relatedHoldingWeight };
}

function scoreToPriority(score: number): NewsPriority {
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function createReason({
  isLargestHoldingRelated,
  isPortfolioRelated,
  isWatchlistRelated,
  priority,
  relatedHoldingWeight,
  sentiment,
}: {
  isLargestHoldingRelated: boolean;
  isPortfolioRelated: boolean;
  isWatchlistRelated: boolean;
  priority: NewsPriority;
  relatedHoldingWeight?: number;
  sentiment?: string;
}): string {
  if (isLargestHoldingRelated) {
    return "Liittyy salkun suurimpaan omistukseen.";
  }

  if (isPortfolioRelated && relatedHoldingWeight !== undefined && relatedHoldingWeight >= 15) {
    return `Liittyy merkittävään portfolio-omistukseen (${relatedHoldingWeight.toFixed(1)} %).`;
  }

  if (isPortfolioRelated && sentiment === "negative") {
    return "Negatiivinen uutinen liittyy portfolio-omistukseen.";
  }

  if (isPortfolioRelated) {
    return "Liittyy portfolio-omistukseen.";
  }

  if (isWatchlistRelated) {
    return "Liittyy seurantalistan yhtiöön.";
  }

  if (priority === "medium") {
    return "Uutinen on tuore ja liittyy seurattuihin markkinakohteisiin.";
  }

  return "Yleinen uutinen, jolla on heikompi yhteys nykyiseen dataan.";
}

export function buildNewsInsights(
  news: NewsItem[],
  portfolio: Portfolio,
  watchlist: Watchlist,
  rates?: FXRateMap
): NewsInsight[] {
  const rows = calculateNewsRows(news);
  const tickerCounts = getTickerCounts(news);
  const { holdingByTicker, holdingValueByTicker, holdingWeightByTicker } =
    getHoldingMaps(portfolio, rates);
  const portfolioTickers = new Set(portfolio.holdings.map((holding) => normalizeTicker(holding.ticker)));
  const watchlistTickers = new Set(watchlist.items.map((item) => normalizeTicker(item.ticker)));
  const trackedTickers = new Set([...portfolioTickers, ...watchlistTickers]);
  const largestHoldingTicker = portfolio.holdings
    .map((holding) => ({
      ticker: normalizeTicker(holding.ticker),
      value: calculateHoldingValue(holding, rates),
    }))
    .sort((a, b) => b.value - a.value)[0]?.ticker;

  return rows
    .map((row) => {
      const affectedSymbols = getAffectedSymbols(row, trackedTickers);
      const isPortfolioRelated = affectedSymbols.some((ticker) => portfolioTickers.has(ticker));
      const isWatchlistRelated = affectedSymbols.some((ticker) => watchlistTickers.has(ticker));
      const isLargestHoldingRelated =
        largestHoldingTicker !== undefined && affectedSymbols.includes(largestHoldingTicker);
      const ageHours = getAgeHours(row.publishedAt);
      const { relatedHoldingValue, relatedHoldingWeight } = getHighestHoldingExposure(
        affectedSymbols,
        holdingValueByTicker,
        holdingWeightByTicker
      );
      const hasMultipleRelatedNews = affectedSymbols.some(
        (ticker) => (tickerCounts.get(ticker) ?? 0) >= 2
      );

      let score = 0;
      const impactTags: string[] = [];

      if (isLargestHoldingRelated) {
        score += 4;
        impactTags.push("Largest holding");
      }

      if (isPortfolioRelated) {
        score += 2;
        impactTags.push("Portfolio");
      }

      if (isWatchlistRelated) {
        score += 1;
        impactTags.push("Watchlist");
      }

      if (row.sentiment === "negative") {
        score += isPortfolioRelated ? 3 : 1;
        impactTags.push("Negative sentiment");
      }

      if (row.sentiment === "positive") {
        score += isPortfolioRelated ? 1 : 0;
        impactTags.push("Positive sentiment");
      }

      if (relatedHoldingWeight !== undefined && relatedHoldingWeight >= 15) {
        score += 3;
        impactTags.push("High allocation exposure");
      }

      if (ageHours !== undefined && ageHours <= 24) {
        score += isPortfolioRelated ? 2 : 1;
        impactTags.push("Fresh news");
      }

      if (hasMultipleRelatedNews) {
        score += row.sentiment === "negative" && isPortfolioRelated ? 2 : 1;
        impactTags.push("Multiple related news");
      }

      if (holdingByTicker.size === 0 && !isWatchlistRelated) {
        score = Math.min(score, 2);
      }

      const priority = scoreToPriority(score);

      return {
        ...row,
        priority,
        reason: createReason({
          isLargestHoldingRelated,
          isPortfolioRelated,
          isWatchlistRelated,
          priority,
          relatedHoldingWeight,
          sentiment: row.sentiment,
        }),
        relatedHoldingValue,
        relatedHoldingWeight,
        isPortfolioRelated,
        isWatchlistRelated,
        affectedSymbols,
        ageHours,
        impactTags: [...new Set(impactTags)],
      };
    })
    .sort((a, b) => {
      const priorityDelta = PRIORITY_SCORE[b.priority] - PRIORITY_SCORE[a.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}

export function summarizeNewsInsights(insights: NewsInsight[]): NewsIntelligenceSummary {
  return {
    highPriorityCount: insights.filter((item) => item.priority === "high").length,
    negativePortfolioCount: insights.filter(
      (item) => item.isPortfolioRelated && item.sentiment === "negative"
    ).length,
    watchlistUpdateCount: insights.filter((item) => item.isWatchlistRelated).length,
  };
}
