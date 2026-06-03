import {
  buildPortfolioInsights,
  calculateAllocationByAssetType,
  calculateHoldingCost,
  calculateHoldingDayChangePercent,
  calculateHoldingValue,
  calculatePortfolioSummary,
  type Portfolio,
  type PortfolioInsightSeverity,
} from "@/lib/portfolio";
import { buildOnboardingChecklist } from "@/lib/onboarding";
import { buildActionSuggestions } from "@/lib/actions";
import { calculateAlertRows, type PriceAlert } from "@/lib/alerts";
import type { DataHealthSummary } from "@/lib/dataStatus";
import type { FXRateMap, FXRatesResponse } from "@/lib/currency";
import { getStaticFxRates } from "@/lib/currency";
import {
  buildNewsInsights,
  type NewsInsight,
  type NewsItem,
  type NewsProviderSource,
} from "@/lib/news";
import { buildWatchlistResearch, calculateWatchlistItemChange, type Watchlist } from "@/lib/watchlist";
import type { CompanySnapshot } from "@/lib/company";
import { buildPortfolioHistory, buildPortfolioPerformance, type Transaction } from "@/lib/transactions";
import { buildAllocationDrift, buildContributionPlan, sumTargetPercents, type PortfolioGoalSettings } from "@/lib/goals";
import type { ScenarioResult } from "@/lib/scenarios";
import type {
  AgentAlertContext,
  AgentCompanySnapshot,
  AgentContributionPlan,
  AgentContext,
  AgentFxContext,
  AgentGoalContext,
  AgentHistorySummary,
  AgentNewsContext,
  AgentOnboardingSummary,
  AgentPerformanceSummary,
  AgentPortfolioContext,
  AgentPortfolioInsight,
  AgentRiskSignal,
  AgentScenarioResult,
  AgentWatchlistContext,
  AgentWatchlistResearchItem,
} from "./types";

const TOP_HOLDINGS_LIMIT = 5;
const NEWS_LIMIT = 5;
const PORTFOLIO_INSIGHTS_LIMIT = 8;

export function buildAgentPortfolioContext(
  portfolio: Portfolio,
  rates?: FXRateMap
): AgentPortfolioContext {
  const summary = calculatePortfolioSummary(portfolio, rates);
  const allocation = calculateAllocationByAssetType(portfolio, rates);
  const totalValue = summary.totalValue;

  const topHoldings = portfolio.holdings
    .map((holding) => {
      const value = calculateHoldingValue(holding, rates);
      const cost = calculateHoldingCost(holding, rates);

      return {
        name: holding.name,
        ticker: holding.ticker,
        assetType: holding.assetType,
        value,
        weightPercent: totalValue !== 0 ? (value / totalValue) * 100 : 0,
        dayChangePercent: calculateHoldingDayChangePercent(holding),
        totalReturnPercent: cost !== 0 ? ((value - cost) / cost) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_HOLDINGS_LIMIT);

  return {
    portfolioName: portfolio.name,
    baseCurrency: portfolio.baseCurrency,
    totalValue: summary.totalValue,
    dayChangeValue: summary.dayChangeValue,
    dayChangePercent: summary.dayChangePercent,
    totalReturnValue: summary.totalReturnValue,
    totalReturnPercent: summary.totalReturnPercent,
    allocation,
    topHoldings,
  };
}

export function buildAgentWatchlistContext(watchlist: Watchlist): AgentWatchlistContext {
  return {
    watchlistName: watchlist.name,
    items: watchlist.items.map((item) => {
      const { changePercent } = calculateWatchlistItemChange(item);

      return {
        name: item.name,
        ticker: item.ticker,
        assetType: item.assetType,
        price: item.currentPrice,
        changePercent,
        tags: item.tags ?? [],
        notes: item.notes,
      };
    }),
  };
}

export function buildAgentAlertContext(
  alerts: PriceAlert[],
  portfolio: Portfolio,
  watchlist: Watchlist
): AgentAlertContext {
  const evaluatedRows = calculateAlertRows(alerts, portfolio, watchlist);
  const evaluatedRowsById = new Map(evaluatedRows.map((row) => [row.id, row]));

  const alertItems = alerts.map((alert) => {
    const evaluatedRow = evaluatedRowsById.get(alert.id);

    return {
      ticker: alert.ticker,
      name: alert.name,
      direction: alert.direction,
      targetPrice: alert.targetPrice,
      currentPrice: evaluatedRow?.currentPrice,
      currency: alert.currency,
      status: evaluatedRow?.status ?? alert.status,
      note: alert.note,
    };
  });

  return {
    activeAlerts: alertItems.filter((alert) => alert.status === "active"),
    triggeredAlerts: alertItems.filter((alert) => alert.status === "triggered"),
  };
}

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function mapNewsInsights(insights: NewsInsight[]) {
  return insights.map((item) => ({
    title: item.title,
    source: item.source,
    publishedAt: item.publishedAt,
    timeLabel: item.timeLabel,
    priority: item.priority,
    reason: item.reason,
    impactTags: item.impactTags,
    isPortfolioRelated: item.isPortfolioRelated,
    isWatchlistRelated: item.isWatchlistRelated,
    affectedSymbols: item.affectedSymbols,
    relatedHoldingWeight: item.relatedHoldingWeight,
    tickers: item.tickers,
    sentiment: item.sentiment,
    summary: item.summary,
    url: item.url,
  }));
}

function filterInsightsByTickers(insights: NewsInsight[], tickers: Set<string>): NewsInsight[] {
  return insights.filter((item) =>
    item.affectedSymbols.some((ticker) => tickers.has(normalizeTicker(ticker)))
  );
}

export function buildAgentNewsContext(
  news: NewsItem[],
  portfolio: Portfolio,
  watchlist: Watchlist,
  providerSource: NewsProviderSource = "mock",
  rates?: FXRateMap
): AgentNewsContext {
  const insights = buildNewsInsights(news, portfolio, watchlist, rates);
  const portfolioTickers = new Set(
    portfolio.holdings.map((holding) => normalizeTicker(holding.ticker))
  );
  const watchlistTickers = new Set(
    watchlist.items.map((item) => normalizeTicker(item.ticker))
  );

  return {
    providerSource,
    latestNews: mapNewsInsights(insights.slice(0, NEWS_LIMIT)),
    portfolioRelatedNews: mapNewsInsights(
      filterInsightsByTickers(insights, portfolioTickers).slice(0, NEWS_LIMIT)
    ),
    watchlistRelatedNews: mapNewsInsights(
      filterInsightsByTickers(insights, watchlistTickers).slice(0, NEWS_LIMIT)
    ),
  };
}

function mapPortfolioInsightSeverity(severity: PortfolioInsightSeverity): AgentRiskSignal["severity"] {
  if (severity === "critical") return "high";
  if (severity === "warning") return "medium";
  return "low";
}

export function buildAgentPortfolioInsights(
  portfolio: Portfolio,
  watchlist: Watchlist,
  alerts: PriceAlert[] = [],
  news: NewsItem[] = [],
  newsProviderSource: NewsProviderSource = "mock",
  transactions: Transaction[] = [],
  goalSettings?: PortfolioGoalSettings,
  rates?: FXRateMap
): AgentPortfolioInsight[] {
  const summary = calculatePortfolioSummary(portfolio, rates);
  const performance = buildPortfolioPerformance(transactions, portfolio.holdings, summary.totalValue, rates);
  const historySummary = buildPortfolioHistory(transactions, summary.totalValue, rates);
  const allocation = calculateAllocationByAssetType(portfolio, rates);
  const allocationDrift = goalSettings
    ? buildAllocationDrift(goalSettings, allocation, summary.totalValue)
    : undefined;
  return buildPortfolioInsights({
    alerts,
    allocationDrift,
    historySummary,
    news,
    newsProviderSource,
    performance,
    portfolio,
    rates,
    watchlist,
  })
    .slice(0, PORTFOLIO_INSIGHTS_LIMIT)
    .map((insight) => ({
      id: insight.id,
      title: insight.title,
      description: insight.description,
      severity: insight.severity,
      category: insight.category,
      relatedSymbols: insight.relatedSymbols,
      metricLabel: insight.metricLabel,
      metricValue: insight.metricValue,
    }));
}

export function buildAgentWatchlistResearch(
  watchlist: Watchlist,
  news: NewsItem[],
  portfolio: Portfolio,
  rates?: FXRateMap
): AgentWatchlistResearchItem[] {
  return buildWatchlistResearch(watchlist, news, portfolio, rates).map((item) => ({
    symbol: item.symbol,
    name: item.name,
    priority: item.priority,
    sentiment: item.sentiment,
    newsCount: item.newsCount,
    highPriorityNewsCount: item.highPriorityNewsCount,
    reason: item.reason,
    tags: item.tags,
    suggestedPrompt: item.suggestedPrompt,
  }));
}

export function buildAgentRiskSignals(
  portfolio: Portfolio,
  watchlist: Watchlist,
  alerts: PriceAlert[] = [],
  news: NewsItem[] = [],
  newsProviderSource: NewsProviderSource = "mock",
  transactions: Transaction[] = [],
  goalSettings?: PortfolioGoalSettings,
  rates?: FXRateMap
): AgentRiskSignal[] {
  const summary = calculatePortfolioSummary(portfolio, rates);
  const performance = buildPortfolioPerformance(transactions, portfolio.holdings, summary.totalValue, rates);
  const historySummary = buildPortfolioHistory(transactions, summary.totalValue, rates);
  const allocation = calculateAllocationByAssetType(portfolio, rates);
  const allocationDrift = goalSettings
    ? buildAllocationDrift(goalSettings, allocation, summary.totalValue)
    : undefined;
  return buildPortfolioInsights({
    alerts,
    allocationDrift,
    historySummary,
    news,
    newsProviderSource,
    performance,
    portfolio,
    rates,
    watchlist,
  })
    .filter((insight) => insight.severity === "critical" || insight.severity === "warning")
    .slice(0, 6)
    .map((insight) => ({
      id: insight.id,
      label: insight.title,
      severity: mapPortfolioInsightSeverity(insight.severity),
      description: insight.description,
    }));
}

function mapCompanySnapshot(snapshot: CompanySnapshot): AgentCompanySnapshot {
  return {
    symbol: snapshot.symbol,
    name: snapshot.name,
    isHolding: snapshot.isHolding,
    isWatchlist: snapshot.isWatchlist,
    assetType: snapshot.assetType,
    price: snapshot.price,
    marketValue: snapshot.marketValue,
    portfolioWeight: snapshot.portfolioWeight,
    dayChangePercent: snapshot.dayChangePercent,
    totalReturnPercent: snapshot.totalReturnPercent,
    newsCount: snapshot.newsCount,
    highPriorityNewsCount: snapshot.highPriorityNewsCount,
    sentiment: snapshot.sentiment,
    insights: snapshot.insights,
    tags: snapshot.tags,
    suggestedPrompts: snapshot.suggestedPrompts,
  };
}

export function buildAgentGoalContext(
  goalSettings: PortfolioGoalSettings,
  portfolio: Portfolio,
  rates?: FXRateMap
): AgentGoalContext {
  const hasGoals = goalSettings.allocationTargets.length > 0;
  if (!hasGoals) {
    return {
      hasGoals: false,
      monthlyContributionTarget: goalSettings.monthlyContributionTarget,
      totalTargetPercent: 0,
      topDrifts: [],
      overweightLabels: [],
      underweightLabels: [],
    };
  }

  const summary = calculatePortfolioSummary(portfolio, rates);
  const allocation = calculateAllocationByAssetType(portfolio, rates);
  const drift = buildAllocationDrift(goalSettings, allocation, summary.totalValue);
  const totalTargetPercent = sumTargetPercents(goalSettings);

  const sorted = [...drift].sort(
    (a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent)
  );

  return {
    hasGoals: true,
    monthlyContributionTarget: goalSettings.monthlyContributionTarget,
    totalTargetPercent,
    topDrifts: sorted.slice(0, 5).map((d) => ({
      key: d.key,
      label: d.label,
      currentPercent: d.currentPercent,
      targetPercent: d.targetPercent,
      driftPercent: d.driftPercent,
      status: d.status,
    })),
    overweightLabels: drift
      .filter((d) => d.status === "overweight")
      .map((d) => d.label),
    underweightLabels: drift
      .filter((d) => d.status === "underweight")
      .map((d) => d.label),
  };
}

export function buildAgentContributionPlan(
  goalSettings: PortfolioGoalSettings | undefined,
  portfolio: Portfolio,
  rates?: FXRateMap
): AgentContributionPlan {
  if (!goalSettings || goalSettings.allocationTargets.length === 0) {
    return {
      hasGoals: false,
      contributionAmount: 0,
      topItems: [],
      summary: "No allocation targets set.",
      totalAllocated: 0,
      unallocatedAmount: 0,
    };
  }

  const summary = calculatePortfolioSummary(portfolio, rates);
  const allocation = calculateAllocationByAssetType(portfolio, rates);
  const drift = buildAllocationDrift(goalSettings, allocation, summary.totalValue);
  const contributionAmount = goalSettings.monthlyContributionTarget ?? 500;
  const plan = buildContributionPlan(goalSettings, drift, summary.totalValue, contributionAmount);

  return {
    hasGoals: true,
    contributionAmount,
    primaryFocusLabel: plan.primaryFocus?.label,
    primaryFocusSuggestedAmount: plan.primaryFocus?.suggestedAmount,
    topItems: plan.items
      .filter((i) => i.suggestedAmount > 0)
      .sort((a, b) => b.suggestedAmount - a.suggestedAmount)
      .slice(0, 5)
      .map((i) => ({
        key: i.key,
        label: i.label,
        suggestedAmount: i.suggestedAmount,
        currentPercent: i.currentPercent,
        projectedPercent: i.projectedPercent,
        reason: i.reason,
      })),
    summary: plan.summary,
    totalAllocated: plan.totalAllocated,
    unallocatedAmount: plan.unallocatedAmount,
  };
}

export function buildAgentHistorySummary(
  transactions: Transaction[],
  currentPortfolioValue: number,
  rates?: FXRateMap
): AgentHistorySummary {
  const history = buildPortfolioHistory(transactions, currentPortfolioValue, rates);
  return {
    hasHistory: history.hasHistory,
    firstDate: history.firstDate,
    lastDate: history.lastDate,
    periodMonths: history.periodMonths,
    totalDeposits: history.totalDeposits,
    totalWithdrawals: history.totalWithdrawals,
    netContributions: history.netContributions,
    totalDividends: history.totalDividends,
    totalFees: history.totalFees,
    currentValue: history.currentValue,
    estimatedGainLoss: history.estimatedGainLoss,
    estimatedReturnPercent: history.estimatedReturnPercent,
    pointCount: history.points.length,
  };
}

export function buildAgentPerformanceSummary(
  transactions: Transaction[],
  portfolio: Portfolio,
  rates?: FXRateMap
): AgentPerformanceSummary {
  const summary = calculatePortfolioSummary(portfolio, rates);
  const perf = buildPortfolioPerformance(
    transactions,
    portfolio.holdings,
    summary.totalValue,
    rates
  );

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((tx) => ({
      type: tx.type,
      symbol: tx.symbol,
      name: tx.name,
      quantity: tx.quantity,
      price: tx.price,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      note: tx.note,
    }));

  return {
    hasTransactions: perf.hasTransactions,
    transactionCount: perf.transactionCount,
    firstTransactionDate: perf.firstTransactionDate,
    lastTransactionDate: perf.lastTransactionDate,
    totalDeposits: perf.totalDeposits,
    totalWithdrawals: perf.totalWithdrawals,
    netContributions: perf.netContributions,
    realizedDividends: perf.realizedDividends,
    totalFees: perf.totalFees,
    currentPortfolioValue: perf.currentPortfolioValue,
    simpleGainLoss: perf.simpleGainLoss,
    simpleReturnPercent: perf.simpleReturnPercent,
    recentTransactions,
    topUnrealizedGains: perf.topUnrealizedGains.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      unrealizedGain: p.unrealizedGain,
      unrealizedGainPercent: p.unrealizedGainPercent,
    })),
    topUnrealizedLosses: perf.topUnrealizedLosses.map((p) => ({
      symbol: p.symbol,
      name: p.name,
      unrealizedGain: p.unrealizedGain,
      unrealizedGainPercent: p.unrealizedGainPercent,
    })),
  };
}

function buildAgentOnboardingSummary(
  portfolio: Portfolio,
  watchlist: Watchlist,
  transactions: Transaction[],
  goalSettings: PortfolioGoalSettings | undefined,
  fxRates: FXRatesResponse | undefined,
  marketDataSource: "api" | "mock",
  newsProviderSource: NewsProviderSource
): AgentOnboardingSummary {
  const checklist = buildOnboardingChecklist({
    portfolio,
    watchlist,
    transactions,
    goalSettings: goalSettings ?? { allocationTargets: [], updatedAt: "" },
    fxSource: fxRates?.source ?? "static",
    marketSource: marketDataSource === "api" ? "live" : "mock",
    newsSource: newsProviderSource === "live" ? "live" : "mock",
  });

  const pendingSteps = checklist.steps.filter(
    (s) => s.id !== "backup" && s.status !== "done"
  );

  return {
    totalSteps: checklist.totalSteps,
    completedSteps: checklist.completedSteps,
    isComplete: checklist.isComplete,
    pendingTitles: pendingSteps.slice(0, 5).map((s) => s.title),
    nextStepTitle: checklist.nextStep?.title ?? null,
  };
}

function buildAgentFxContext(fxRates?: FXRatesResponse): AgentFxContext {
  const response = fxRates ?? getStaticFxRates();
  return {
    baseCurrency: response.baseCurrency,
    source: response.source,
    lastUpdated: response.updatedAt,
    rates: response.rates,
  };
}

function mapScenarioResult(s: ScenarioResult): AgentScenarioResult {
  return {
    type: s.input.type,
    label: s.input.label,
    basePortfolioValue: s.basePortfolioValue,
    projectedPortfolioValue: s.projectedPortfolioValue,
    valueChange: s.valueChange,
    valueChangePercent: s.valueChangePercent,
    affectedSymbols: s.affectedSymbols.slice(0, 5),
    affectedCategories: s.affectedCategories,
    topDriftChanges: s.topDriftChanges.map((d) => ({
      key: d.key,
      label: d.label,
      driftBefore: d.driftBefore,
      driftAfter: d.driftAfter,
      changePP: d.changePP,
    })),
    summary: s.summary,
    warnings: s.warnings.slice(0, 3),
  };
}

export function buildAgentContext(
  portfolio: Portfolio,
  watchlist: Watchlist,
  alerts: PriceAlert[] = [],
  news: NewsItem[] = [],
  newsProviderSource: NewsProviderSource = "mock",
  marketDataSource: "api" | "mock" = "mock",
  dataHealthSummary?: DataHealthSummary,
  selectedCompanySnapshot?: CompanySnapshot | null,
  transactions: Transaction[] = [],
  goalSettings?: PortfolioGoalSettings,
  scenarioResult?: ScenarioResult | null,
  rates?: FXRateMap,
  fxRates?: FXRatesResponse
): AgentContext {
  const asOf =
    [
      portfolio.updatedAt,
      watchlist.updatedAt,
      ...alerts.map((alert) => alert.updatedAt),
      ...news.map((item) => item.updatedAt),
    ]
      .filter(Boolean)
      .sort()
      .at(-1) ?? new Date().toISOString();

  const summary = calculatePortfolioSummary(portfolio, rates);

  return {
    asOf,
    fx: buildAgentFxContext(fxRates),
    portfolio: buildAgentPortfolioContext(portfolio, rates),
    watchlist: buildAgentWatchlistContext(watchlist),
    alerts: buildAgentAlertContext(alerts, portfolio, watchlist),
    news: buildAgentNewsContext(news, portfolio, watchlist, newsProviderSource, rates),
    portfolioInsights: buildAgentPortfolioInsights(
      portfolio,
      watchlist,
      alerts,
      news,
      newsProviderSource,
      transactions,
      goalSettings,
      rates
    ),
    watchlistResearch: buildAgentWatchlistResearch(watchlist, news, portfolio, rates),
    selectedCompanySnapshot: selectedCompanySnapshot
      ? mapCompanySnapshot(selectedCompanySnapshot)
      : null,
    actionSuggestions: buildActionSuggestions({
      alerts,
      dataHealthSummary,
      marketDataSource,
      news,
      newsSource: newsProviderSource,
      portfolio,
      rates,
      watchlist,
    }).slice(0, 8),
    dataHealthSummary:
      dataHealthSummary ?? {
        items: [],
        overallStatus: "unknown",
        warnings: ["Data health summary is not available."],
      },
    riskSignals: buildAgentRiskSignals(portfolio, watchlist, alerts, news, newsProviderSource, transactions, goalSettings, rates),
    performance: buildAgentPerformanceSummary(transactions, portfolio, rates),
    portfolioHistory: buildAgentHistorySummary(transactions, summary.totalValue, rates),
    goals: goalSettings
      ? buildAgentGoalContext(goalSettings, portfolio, rates)
      : { hasGoals: false, totalTargetPercent: 0, topDrifts: [], overweightLabels: [], underweightLabels: [] },
    contributionPlan: buildAgentContributionPlan(goalSettings, portfolio, rates),
    scenario: scenarioResult ? mapScenarioResult(scenarioResult) : null,
    onboarding: buildAgentOnboardingSummary(
      portfolio,
      watchlist,
      transactions,
      goalSettings,
      fxRates,
      marketDataSource,
      newsProviderSource
    ),
  };
}
