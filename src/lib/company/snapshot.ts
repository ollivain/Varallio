import {
  ASSET_TYPE_LABELS,
  calculateHoldingCost,
  calculateHoldingDayChangePercent,
  calculateHoldingValue,
  calculatePortfolioSummary,
  type Portfolio,
} from "@/lib/portfolio";
import { buildNewsInsights, type NewsItem, type NewsSentiment } from "@/lib/news";
import type { Watchlist } from "@/lib/watchlist";
import type { Currency } from "@/lib/portfolio/types";
import type { FXRateMap } from "@/lib/currency";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompanySnapshotSentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "mixed"
  | "unknown";

export interface CompanySnapshot {
  symbol: string;
  name?: string;
  isHolding: boolean;
  isWatchlist: boolean;
  assetType?: string;
  currency?: Currency;
  // Portfolio holding data
  quantity?: number;
  price?: number;
  marketValue?: number;
  portfolioWeight?: number;
  dayChangePercent?: number;
  totalReturnPercent?: number;
  // News & sentiment
  newsCount: number;
  highPriorityNewsCount: number;
  sentiment: CompanySnapshotSentiment;
  relatedNewsTitles: string[];
  // Analysis
  insights: string[];
  tags: string[];
  suggestedPrompts: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function computeSentiment(
  sentiments: (NewsSentiment | undefined)[]
): CompanySnapshotSentiment {
  const valid = sentiments.filter(
    (s): s is NewsSentiment =>
      s === "positive" || s === "negative" || s === "neutral"
  );
  if (valid.length === 0) return "unknown";
  const hasPositive = valid.includes("positive");
  const hasNegative = valid.includes("negative");
  if (hasPositive && hasNegative) return "mixed";
  if (hasNegative) return "negative";
  if (hasPositive) return "positive";
  return "neutral";
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Build a compact research snapshot for any symbol the user has in their
 * portfolio or watchlist.
 *
 * Works with whatever data is currently available — mock or live. Does not
 * make external requests.
 */
export function buildCompanySnapshot(
  symbol: string,
  portfolio: Portfolio,
  watchlist: Watchlist,
  news: NewsItem[],
  rates?: FXRateMap
): CompanySnapshot {
  const normalized = normalizeTicker(symbol);

  // ── Portfolio holding lookup ───────────────────────────────────────────────
  const holding = portfolio.holdings.find(
    (h) => normalizeTicker(h.ticker) === normalized
  );

  // ── Watchlist item lookup ──────────────────────────────────────────────────
  const watchlistItem = watchlist.items.find(
    (i) => normalizeTicker(i.ticker) === normalized
  );

  // ── Portfolio calculations ─────────────────────────────────────────────────
  const { totalValue } = calculatePortfolioSummary(portfolio, rates);
  const marketValue = holding ? calculateHoldingValue(holding, rates) : undefined;
  const holdingCost = holding ? calculateHoldingCost(holding, rates) : undefined;

  const portfolioWeight =
    marketValue !== undefined && totalValue > 0
      ? (marketValue / totalValue) * 100
      : undefined;

  const dayChangePercent = holding
    ? calculateHoldingDayChangePercent(holding)
    : undefined;

  const totalReturnPercent =
    holdingCost !== undefined &&
    marketValue !== undefined &&
    holdingCost > 0
      ? ((marketValue - holdingCost) / holdingCost) * 100
      : undefined;

  // ── News ──────────────────────────────────────────────────────────────────
  const allInsights = buildNewsInsights(news, portfolio, watchlist, rates);
  const related = allInsights.filter((i) =>
    i.affectedSymbols.map(normalizeTicker).includes(normalized)
  );

  const newsCount = related.length;
  const highPriorityNewsCount = related.filter((i) => i.priority === "high").length;
  const sentiment = computeSentiment(related.map((i) => i.sentiment));
  const relatedNewsTitles = related.slice(0, 3).map((i) => i.title);

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagSet = new Set<string>();
  if (holding?.sector) tagSet.add(holding.sector);
  if (holding?.assetType) {
    const label = ASSET_TYPE_LABELS[holding.assetType];
    if (label) tagSet.add(label);
  }
  for (const tag of watchlistItem?.tags ?? []) tagSet.add(tag);
  for (const insight of related) {
    for (const tag of insight.impactTags) tagSet.add(tag);
  }
  const tags = [...tagSet].slice(0, 6);

  // ── Insight bullets ───────────────────────────────────────────────────────
  const insights: string[] = [];

  if (portfolioWeight !== undefined) {
    insights.push(`Paino salkussa: ${portfolioWeight.toFixed(1)} %`);
  }
  if (dayChangePercent !== undefined && dayChangePercent !== 0) {
    const sign = dayChangePercent >= 0 ? "+" : "";
    insights.push(`Päivän muutos: ${sign}${dayChangePercent.toFixed(2)} %`);
  }
  if (totalReturnPercent !== undefined) {
    const sign = totalReturnPercent >= 0 ? "+" : "";
    insights.push(`Kokonaistuotto: ${sign}${totalReturnPercent.toFixed(1)} %`);
  }
  if (highPriorityNewsCount > 0) {
    insights.push(
      `${highPriorityNewsCount} high priority ${highPriorityNewsCount === 1 ? "uutinen" : "uutista"}`
    );
  }
  if (sentiment === "negative") {
    insights.push("Negatiivinen uutissentiment");
  } else if (sentiment === "mixed") {
    insights.push("Sekalainen uutissentiment");
  }
  if (watchlistItem?.notes) {
    insights.push(`Muistiinpano: ${watchlistItem.notes}`);
  }

  // ── Name, type, currency ──────────────────────────────────────────────────
  const name = holding?.name ?? watchlistItem?.name;
  const assetType = holding?.assetType ?? watchlistItem?.assetType;
  const currency = holding?.currency ?? watchlistItem?.currency;
  const price = holding?.currentPrice ?? watchlistItem?.currentPrice;

  // ── Suggested prompts ─────────────────────────────────────────────────────
  const ref = name ? `${name} (${symbol})` : symbol;
  const suggestedPrompts = [
    `Kerro ${ref} nykytilanne ja tärkein huomio lyhyesti.`,
    `Mitä riskejä ${ref} sisältää tällä hetkellä?`,
    `Vertaa ${ref} muihin ${holding ? "omistuksiini" : "seurantakohteisiini"}.`,
  ];

  return {
    symbol,
    name,
    isHolding: !!holding,
    isWatchlist: !!watchlistItem,
    assetType,
    currency,
    quantity: holding?.quantity,
    price,
    marketValue,
    portfolioWeight,
    dayChangePercent,
    totalReturnPercent,
    newsCount,
    highPriorityNewsCount,
    sentiment,
    relatedNewsTitles,
    insights,
    tags,
    suggestedPrompts,
  };
}
