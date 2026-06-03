import { calculateAlertRows, type PriceAlert } from "@/lib/alerts";
import type { DataHealthSummary } from "@/lib/dataStatus";
import type { AllocationDrift, ContributionPlan } from "@/lib/goals";
import type { ScenarioResult } from "@/lib/scenarios";
import { buildNewsInsights, type NewsItem, type NewsProviderSource } from "@/lib/news";
import {
  buildPortfolioInsights,
  calculateHoldingValue,
  type Holding,
  type Portfolio,
  type PortfolioInsight,
} from "@/lib/portfolio";
import { buildWatchlistResearch, type Watchlist } from "@/lib/watchlist";
import type {
  ActionSuggestion,
  ActionSuggestionPriority,
  ActionSuggestionType,
} from "./types";
import type { FXRateMap } from "@/lib/currency";

const PRIORITY_ORDER: Record<ActionSuggestionPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const TYPE_DEFAULT_CTA: Record<ActionSuggestionType, string> = {
  ask_agent: "Ask agent",
  compare: "Compare",
  monitor: "Monitor",
  review: "Review",
  update_data: "Update",
};

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function uniqueSymbols(symbols: string[] | undefined): string[] | undefined {
  const unique = [...new Set((symbols ?? []).map(normalizeTicker).filter(Boolean))];
  return unique.length > 0 ? unique : undefined;
}

function addSuggestion(
  suggestions: ActionSuggestion[],
  suggestion: Omit<ActionSuggestion, "ctaLabel"> & { ctaLabel?: string }
) {
  if (suggestions.some((item) => item.id === suggestion.id)) return;

  suggestions.push({
    ctaLabel: TYPE_DEFAULT_CTA[suggestion.type],
    ...suggestion,
    relatedSymbols: uniqueSymbols(suggestion.relatedSymbols),
  });
}

function priorityFromInsight(insight: PortfolioInsight): ActionSuggestionPriority {
  if (insight.severity === "critical" || insight.priority >= 80) return "high";
  if (insight.severity === "warning" || insight.priority >= 40) return "medium";
  return "low";
}

function typeFromInsight(insight: PortfolioInsight): ActionSuggestionType {
  if (insight.category === "alerts") return "monitor";
  if (insight.category === "news") return "monitor";
  if (insight.category === "diversification") return "compare";
  return "review";
}

function promptForInsight(insight: PortfolioInsight): string {
  const symbolText = insight.relatedSymbols?.length
    ? ` Related symbols: ${insight.relatedSymbols.join(", ")}.`
    : "";

  return `Explain this portfolio insight in plain language: ${insight.title}. ${insight.description}${symbolText}`;
}

export function buildActionSuggestions({
  alerts = [],
  allocationDrift,
  contributionPlan,
  dataHealthSummary,
  marketDataSource = "mock",
  news = [],
  newsSource = "mock",
  portfolio,
  rates,
  scenarioResult,
  watchlist,
}: {
  alerts?: PriceAlert[];
  allocationDrift?: AllocationDrift[];
  contributionPlan?: ContributionPlan;
  dataHealthSummary?: DataHealthSummary;
  marketDataSource?: "api" | "mock";
  news?: NewsItem[];
  newsSource?: NewsProviderSource;
  portfolio: Portfolio;
  rates?: FXRateMap;
  scenarioResult?: ScenarioResult | null;
  watchlist: Watchlist;
}): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];
  const portfolioInsights = buildPortfolioInsights({
    alerts,
    news,
    newsProviderSource: newsSource,
    portfolio,
    rates,
    watchlist,
  });
  const newsInsights = buildNewsInsights(news, portfolio, watchlist, rates);
  const triggeredAlerts = calculateAlertRows(alerts, portfolio, watchlist).filter(
    (alert) => alert.status === "triggered"
  );

  for (const insight of portfolioInsights.slice(0, 5)) {
    const priority = priorityFromInsight(insight);
    if (priority === "low" && suggestions.length >= 4) continue;

    addSuggestion(suggestions, {
      id: `portfolio-${insight.id}`,
      title:
        insight.id === "single-position-concentration" && insight.relatedSymbols?.[0]
          ? `Review ${insight.relatedSymbols[0]} concentration`
          : insight.title,
      description: insight.description,
      type: typeFromInsight(insight),
      priority,
      source: "portfolio_insight",
      relatedSymbols: insight.relatedSymbols,
      suggestedPrompt: promptForInsight(insight),
    });
  }

  for (const alert of triggeredAlerts.slice(0, 3)) {
    addSuggestion(suggestions, {
      id: `alert-${alert.id}`,
      title: `Ask agent about ${alert.ticker} alert`,
      description: alert.label,
      type: "ask_agent",
      priority: "high",
      source: "alert",
      relatedSymbols: [alert.ticker],
      suggestedPrompt: `Explain why my ${alert.ticker} alert is triggered and what I should review next.`,
      ctaLabel: "Ask agent",
    });
  }

  for (const item of newsInsights.slice(0, 6)) {
    if (item.priority === "high" && item.isPortfolioRelated && item.sentiment === "negative") {
      addSuggestion(suggestions, {
        id: `news-negative-${item.id}`,
        title: `Check negative news affecting ${item.affectedSymbols[0] ?? "holdings"}`,
        description: item.reason,
        type: "monitor",
        priority: "high",
        source: "news_intelligence",
        relatedSymbols: item.affectedSymbols,
        suggestedPrompt: "Summarize the most important negative news affecting my holdings.",
      });
    } else if (item.priority === "high" && item.isWatchlistRelated) {
      addSuggestion(suggestions, {
        id: `news-watchlist-${item.id}`,
        title: `Monitor high priority watchlist news`,
        description: item.reason,
        type: "monitor",
        priority: "medium",
        source: "news_intelligence",
        relatedSymbols: item.affectedSymbols,
        suggestedPrompt: "What should I monitor from my watchlist based on the latest news?",
      });
    } else if (item.priority === "high" && item.isPortfolioRelated && item.sentiment === "positive") {
      addSuggestion(suggestions, {
        id: `news-positive-${item.id}`,
        title: "Ask agent about positive portfolio news",
        description: item.reason,
        type: "ask_agent",
        priority: "medium",
        source: "news_intelligence",
        relatedSymbols: item.affectedSymbols,
        suggestedPrompt: "Which positive news matter most for my holdings and why?",
      });
    }
  }

  const marketStatus = dataHealthSummary?.items.find((item) => item.key === "market");
  const newsStatus = dataHealthSummary?.items.find((item) => item.key === "news");

  if (marketStatus?.status === "mock" || (!marketStatus && marketDataSource === "mock")) {
    addSuggestion(suggestions, {
      id: "refresh-market-prices",
      title: "Refresh market prices",
      description: marketStatus?.message ?? "Prices may be demo/fallback data. Refresh before making decisions.",
      type: "update_data",
      priority: "high",
      source: "data_freshness",
      suggestedPrompt: "What should I check after refreshing market prices?",
      ctaLabel: "Refresh",
    });
    addSuggestion(suggestions, {
      id: "add-market-api-key",
      title: "Add API keys to enable live prices",
      description: "Live market data requires a configured provider key.",
      type: "update_data",
      priority: "low",
      source: "data_freshness",
      suggestedPrompt: "What data sources should I refresh before trusting the dashboard?",
      ctaLabel: "Review",
    });
  } else if (marketStatus?.status === "stale") {
    addSuggestion(suggestions, {
      id: "refresh-stale-market-prices",
      title: "Refresh stale market prices",
      description: marketStatus.message,
      type: "update_data",
      priority: "high",
      source: "data_freshness",
      suggestedPrompt: "What should I re-check after refreshing stale market prices?",
      ctaLabel: "Refresh",
    });
  }

  if (newsStatus?.status === "mock" || (!newsStatus && newsSource === "mock")) {
    addSuggestion(suggestions, {
      id: "refresh-news",
      title: "Refresh news before decisions",
      description: newsStatus?.message ?? "News may be demo/fallback data. Refresh news for a fresher context.",
      type: "update_data",
      priority: "high",
      source: "data_freshness",
      suggestedPrompt: "After refreshing news, summarize which updates matter most for my holdings.",
      ctaLabel: "Refresh",
    });
    addSuggestion(suggestions, {
      id: "add-news-api-key",
      title: "Add API keys to enable live news",
      description: "Live news requires a configured provider key.",
      type: "update_data",
      priority: "low",
      source: "data_freshness",
      suggestedPrompt: "Which data sources are currently mock or fallback in my dashboard?",
      ctaLabel: "Review",
    });
  } else if (newsStatus?.status === "stale") {
    addSuggestion(suggestions, {
      id: "refresh-stale-news",
      title: "Refresh stale news",
      description: newsStatus.message,
      type: "update_data",
      priority: "high",
      source: "data_freshness",
      suggestedPrompt: "After refreshing stale news, summarize what changed for my holdings.",
      ctaLabel: "Refresh",
    });
  }

  // ── Watchlist research suggestions ──────────────────────────────────────────
  const watchlistResearch = buildWatchlistResearch(watchlist, news, portfolio, rates);

  for (const item of watchlistResearch.filter((r) => r.priority === "high").slice(0, 3)) {
    if (item.sentiment === "negative") {
      addSuggestion(suggestions, {
        id: `watchlist-research-negative-${item.symbol}`,
        title: `Review ${item.symbol} negative signals`,
        description: item.reason,
        type: "monitor",
        priority: "high",
        source: "watchlist_research",
        relatedSymbols: [item.symbol],
        suggestedPrompt: item.suggestedPrompt,
        ctaLabel: "Ask agent",
      });
    } else {
      addSuggestion(suggestions, {
        id: `watchlist-research-high-${item.symbol}`,
        title: `Review ${item.symbol} watchlist update`,
        description: item.reason,
        type: "review",
        priority: "medium",
        source: "watchlist_research",
        relatedSymbols: [item.symbol],
        suggestedPrompt: item.suggestedPrompt,
        ctaLabel: "Ask agent",
      });
    }
  }

  const topHolding = portfolio.holdings
    .map((holding: Holding) => ({
      ticker: holding.ticker,
      value: calculateHoldingValue(holding, rates),
    }))
    .sort((a, b) => b.value - a.value)[0];

  if (topHolding && watchlist.items.length > 0) {
    addSuggestion(suggestions, {
      id: "compare-watchlist-ideas",
      title: `Compare ${topHolding.ticker} with watchlist ideas`,
      description: "Use the watchlist to frame alternatives without making an automatic buy/sell decision.",
      type: "compare",
      priority: "low",
      source: "watchlist",
      relatedSymbols: [topHolding.ticker, ...watchlist.items.slice(0, 2).map((item) => item.ticker)],
      suggestedPrompt: `Compare ${topHolding.ticker} with my watchlist alternatives at a high level.`,
    });
  }

  // ── Allocation drift suggestions ──────────────────────────────────────────────
  if (allocationDrift && allocationDrift.length > 0) {
    const bigDrifts = [...allocationDrift]
      .sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent))
      .filter((d) => Math.abs(d.driftPercent) >= 5);

    const worstDrift = bigDrifts[0];
    if (worstDrift) {
      const direction = worstDrift.status === "overweight" ? "yli" : "ali";
      addSuggestion(suggestions, {
        id: `drift-review-${worstDrift.key}`,
        title: `Review ${worstDrift.label} vs target`,
        description: `${worstDrift.label} on ${direction} tavoitteen (${worstDrift.driftPercent >= 0 ? "+" : ""}${worstDrift.driftPercent.toFixed(1)} pp). Vertaa nykyistä painoa tavoitteeseesi.`,
        type: "compare",
        priority: Math.abs(worstDrift.driftPercent) >= 10 ? "high" : "medium",
        source: "portfolio_insight",
        suggestedPrompt: `Miten ${worstDrift.label.toLowerCase()} painoni vertautuu tavoitteeseen, ja mitä kannattaa tarkistaa?`,
        ctaLabel: "Compare",
      });
    }

    if (bigDrifts.length >= 2) {
      addSuggestion(suggestions, {
        id: "drift-rebalance-review",
        title: "Compare overall allocation with your targets",
        description: "Useampi kategoria poikkeaa tavoitteesta — tarkista tasapainotustilanne ennen päätöksiä.",
        type: "review",
        priority: "medium",
        source: "portfolio_insight",
        suggestedPrompt: "Vertaile nykyistä allokaatiotani tavoitteeseeni ja selitä suurimmat poikkeamat.",
        ctaLabel: "Review",
      });
    }
  }

  // ── Scenario suggestions ──────────────────────────────────────────────────────
  if (scenarioResult && scenarioResult.warnings.length === 0) {
    const absPct = Math.abs(scenarioResult.valueChangePercent);
    if (absPct >= 5) {
      addSuggestion(suggestions, {
        id: "scenario-risk-ask",
        title: "Ask agent about current scenario risk",
        description: `Aktiivinen skenaario vaikuttaa arvoon ${scenarioResult.valueChangePercent >= 0 ? "+" : ""}${scenarioResult.valueChangePercent.toFixed(1)} % — kysy agentilta vaikutuksesta.`,
        type: "ask_agent",
        priority: absPct >= 15 ? "high" : "medium",
        source: "portfolio_insight",
        suggestedPrompt: "Selitä tämän skenaarion vaikutus salkkuuni ja mitä riskejä kannattaa huomioida.",
        ctaLabel: "Ask agent",
      });
    }
    if (scenarioResult.topDriftChanges.some((d) => Math.abs(d.changePP) >= 5)) {
      addSuggestion(suggestions, {
        id: "scenario-drift-review",
        title: "Review scenario allocation impact",
        description: "Skenaario muuttaa allokaatiopoikkeamia merkittävästi — tarkista ennen päätöksiä.",
        type: "review",
        priority: "medium",
        source: "portfolio_insight",
        suggestedPrompt: "Miten tämä skenaario vaikuttaisi tavoiteallokaatiooni?",
        ctaLabel: "Review",
      });
    }
  }

  // ── Contribution plan suggestions ────────────────────────────────────────────
  if (contributionPlan?.hasTargets) {
    if (contributionPlan.primaryFocus) {
      addSuggestion(suggestions, {
        id: `contribution-focus-${contributionPlan.primaryFocus.key}`,
        title: `Review ${contributionPlan.primaryFocus.label} as next contribution focus`,
        description: contributionPlan.primaryFocus.reason,
        type: "review",
        priority: "medium",
        source: "portfolio_insight",
        suggestedPrompt: `Selitä, miten seuraava talletus vaikuttaisi ${contributionPlan.primaryFocus.label.toLowerCase()}-allokaatiooni tavoitteeseeni verrattuna.`,
        ctaLabel: "Review",
      });
    }
    addSuggestion(suggestions, {
      id: "contribution-plan-ask-agent",
      title: "Ask agent about monthly contribution plan",
      description: "Kysy agentilta, miten seuraava talletus voisi lähentää tavoiteallokaatiota.",
      type: "ask_agent",
      priority: "low",
      source: "portfolio_insight",
      suggestedPrompt: "Selitä, miten seuraava kuukausisäästö vaikuttaisi tavoiteallokaatiooni.",
      ctaLabel: "Ask agent",
    });
  }

  addSuggestion(suggestions, {
    id: "ask-portfolio-summary",
    title: "Ask agent for portfolio summary",
    description: "Get a concise explanation of the most important portfolio insights.",
    type: "ask_agent",
    priority: "low",
    source: "portfolio_insight",
    suggestedPrompt: "Summarize my suggested next steps and the most important things in my portfolio today.",
  });

  return suggestions.sort((a, b) => {
    const priorityDelta = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return a.title.localeCompare(b.title, "en");
  });
}
