import { buildNewsInsights } from "@/lib/news";
import type { NewsItem, NewsSentiment } from "@/lib/news";
import type { Currency, Portfolio } from "@/lib/portfolio";
import type { FXRateMap } from "@/lib/currency";
import { calculateWatchlistItemChange } from "./calculations";
import type { Watchlist, WatchlistItem } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WatchlistResearchSentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "mixed"
  | "unknown";

export type WatchlistResearchPriority = "high" | "medium" | "low";

export interface WatchlistResearchItem {
  symbol: string;
  name: string;
  currency: Currency;
  price?: number;
  changePercent?: number;
  newsCount: number;
  highPriorityNewsCount: number;
  sentiment: WatchlistResearchSentiment;
  relatedNewsTitles: string[];
  reason: string;
  tags: string[];
  suggestedPrompt: string;
  priority: WatchlistResearchPriority;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function computeSentiment(
  sentiments: (NewsSentiment | undefined)[]
): WatchlistResearchSentiment {
  const valid = sentiments.filter(
    (s): s is NewsSentiment => s === "positive" || s === "negative" || s === "neutral"
  );
  if (valid.length === 0) return "unknown";

  const hasPositive = valid.includes("positive");
  const hasNegative = valid.includes("negative");

  if (hasPositive && hasNegative) return "mixed";
  if (hasNegative) return "negative";
  if (hasPositive) return "positive";
  return "neutral";
}

const RESEARCH_PRIORITY_ORDER: Record<WatchlistResearchPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function computePriority(
  highPriorityNewsCount: number,
  newsCount: number,
  sentiment: WatchlistResearchSentiment
): WatchlistResearchPriority {
  if (highPriorityNewsCount > 0 || sentiment === "negative") return "high";
  if (newsCount > 0 || sentiment === "mixed") return "medium";
  return "low";
}

function buildReason(
  highPriorityNewsCount: number,
  newsCount: number,
  sentiment: WatchlistResearchSentiment
): string {
  if (highPriorityNewsCount > 0 && sentiment === "negative") {
    return "Liittyy negatiivisiin korkeaprioriteetin uutisiin — vaatii tarkistuksen.";
  }
  if (highPriorityNewsCount > 0) {
    return "Liittyy korkeaprioriteetin uutisiin.";
  }
  if (sentiment === "negative") {
    return "Liittyy negatiivisiin uutisiin.";
  }
  if (sentiment === "mixed") {
    return "Sekasignaalit: sekä positiivisia että negatiivisia uutisia.";
  }
  if (newsCount > 0) {
    return "Liittyy ajankohtaisiin uutisiin.";
  }
  return "Ei viimeaikaisia uutisia — seuraa hintamuutoksia ja lisää dataa.";
}

function buildSuggestedPrompt(
  item: WatchlistItem,
  priority: WatchlistResearchPriority,
  sentiment: WatchlistResearchSentiment
): string {
  const ref = `${item.name} (${item.ticker})`;

  if (priority === "high" && sentiment === "negative") {
    return `Analysoi negatiiviset uutiset ja niiden merkitys ${ref} seurannalle.`;
  }
  if (priority === "high") {
    return `Mitä high priority -uutiset tarkoittavat ${ref} kohdalla?`;
  }
  if (priority === "medium") {
    return `Mitä viimeisimmät uutiset kertovat ${ref} tutkimisen arvosta?`;
  }
  return `Arvioi ${ref} kiinnostavuus suhteessa nykyiseen portfoliooni.`;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Build a research snapshot for every watchlist item using live news insights.
 *
 * Each item gets a priority, sentiment, reason, tags and a ready-made prompt
 * for the investment agent. The result is sorted high → low priority.
 */
export function buildWatchlistResearch(
  watchlist: Watchlist,
  news: NewsItem[],
  portfolio: Portfolio,
  rates?: FXRateMap
): WatchlistResearchItem[] {
  if (watchlist.items.length === 0) return [];

  const allInsights = buildNewsInsights(news, portfolio, watchlist, rates);

  const items = watchlist.items.map((item): WatchlistResearchItem => {
    const ticker = normalizeTicker(item.ticker);
    const { changePercent } = calculateWatchlistItemChange(item);

    // News insights that mention this specific watchlist ticker
    const related = allInsights.filter((insight) =>
      insight.affectedSymbols.map(normalizeTicker).includes(ticker)
    );

    const newsCount = related.length;
    const highPriorityNewsCount = related.filter((i) => i.priority === "high").length;
    const sentiment = computeSentiment(related.map((i) => i.sentiment));
    const priority = computePriority(highPriorityNewsCount, newsCount, sentiment);
    const reason = buildReason(highPriorityNewsCount, newsCount, sentiment);

    // Top 3 news titles for the tooltip / expanded view
    const relatedNewsTitles = related.slice(0, 3).map((i) => i.title);

    // Tags: item's own tags first, then deduplicated impact tags from news
    const impactTags = related.flatMap((i) => i.impactTags);
    const tags = [...new Set([...(item.tags ?? []), ...impactTags])].slice(0, 5);

    const suggestedPrompt = buildSuggestedPrompt(item, priority, sentiment);

    return {
      symbol: item.ticker,
      name: item.name,
      currency: item.currency,
      price: item.currentPrice,
      changePercent,
      newsCount,
      highPriorityNewsCount,
      sentiment,
      relatedNewsTitles,
      reason,
      tags,
      suggestedPrompt,
      priority,
    };
  });

  return items.sort(
    (a, b) => RESEARCH_PRIORITY_ORDER[b.priority] - RESEARCH_PRIORITY_ORDER[a.priority]
  );
}
