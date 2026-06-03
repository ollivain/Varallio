import type {
  AllocationItem,
  AssetType,
  Currency,
  PortfolioInsightCategory,
  PortfolioInsightSeverity,
} from "@/lib/portfolio";
import type { CompanySnapshotSentiment } from "@/lib/company";
import type { AlertDirection, AlertStatus } from "@/lib/alerts";
import type { ActionSuggestion } from "@/lib/actions";
import type { DataHealthSummary } from "@/lib/dataStatus";
import type { FXRate, FXRateSource } from "@/lib/currency";
import type { NewsPriority, NewsProviderSource, NewsSentiment } from "@/lib/news";
import type {
  WatchlistAssetType,
  WatchlistResearchPriority,
  WatchlistResearchSentiment,
} from "@/lib/watchlist";

export interface AgentTopHolding {
  name: string;
  ticker: string;
  assetType: AssetType;
  value: number;
  weightPercent: number;
  dayChangePercent: number;
  totalReturnPercent: number;
}

export interface AgentPortfolioContext {
  portfolioName: string;
  baseCurrency: Currency;
  totalValue: number;
  dayChangeValue: number;
  dayChangePercent: number;
  totalReturnValue: number;
  totalReturnPercent: number;
  allocation: AllocationItem[];
  topHoldings: AgentTopHolding[];
}

export interface AgentWatchlistItem {
  name: string;
  ticker: string;
  assetType: WatchlistAssetType;
  price: number;
  changePercent: number;
  tags: string[];
  notes?: string;
}

export interface AgentWatchlistContext {
  watchlistName: string;
  items: AgentWatchlistItem[];
}

export interface AgentAlertItem {
  ticker: string;
  name: string;
  direction: AlertDirection;
  targetPrice: number;
  currentPrice?: number;
  currency: Currency;
  status: AlertStatus;
  note?: string;
}

export interface AgentAlertContext {
  activeAlerts: AgentAlertItem[];
  triggeredAlerts: AgentAlertItem[];
}

export interface AgentNewsItem {
  title: string;
  source: string;
  publishedAt: string;
  timeLabel: string;
  priority: NewsPriority;
  reason: string;
  impactTags: string[];
  isPortfolioRelated: boolean;
  isWatchlistRelated: boolean;
  affectedSymbols: string[];
  relatedHoldingWeight?: number;
  tickers?: string[];
  sentiment?: NewsSentiment;
  summary?: string;
  url?: string;
}

export interface AgentNewsContext {
  providerSource: NewsProviderSource;
  latestNews: AgentNewsItem[];
  portfolioRelatedNews: AgentNewsItem[];
  watchlistRelatedNews: AgentNewsItem[];
}

export interface AgentRiskSignal {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  description: string;
}

export interface AgentPortfolioInsight {
  id: string;
  title: string;
  description: string;
  severity: PortfolioInsightSeverity;
  category: PortfolioInsightCategory;
  relatedSymbols?: string[];
  metricLabel?: string;
  metricValue?: string;
}

export interface AgentWatchlistResearchItem {
  symbol: string;
  name: string;
  priority: WatchlistResearchPriority;
  sentiment: WatchlistResearchSentiment;
  newsCount: number;
  highPriorityNewsCount: number;
  reason: string;
  tags: string[];
  suggestedPrompt: string;
}

export interface AgentCompanySnapshot {
  symbol: string;
  name?: string;
  isHolding: boolean;
  isWatchlist: boolean;
  assetType?: string;
  price?: number;
  marketValue?: number;
  portfolioWeight?: number;
  dayChangePercent?: number;
  totalReturnPercent?: number;
  newsCount: number;
  highPriorityNewsCount: number;
  sentiment: CompanySnapshotSentiment;
  insights: string[];
  tags: string[];
  suggestedPrompts: string[];
}

export interface AgentTransactionItem {
  type: string;
  symbol?: string;
  name?: string;
  quantity?: number;
  price?: number;
  amount: number;
  currency: string;
  date: string;
  note?: string;
}

export interface AgentUnrealizedPosition {
  symbol: string;
  name?: string;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

export interface AgentPerformanceSummary {
  hasTransactions: boolean;
  transactionCount: number;
  firstTransactionDate?: string;
  lastTransactionDate?: string;
  totalDeposits: number;
  totalWithdrawals: number;
  netContributions: number;
  realizedDividends: number;
  totalFees: number;
  currentPortfolioValue: number;
  simpleGainLoss: number;
  simpleReturnPercent: number | null;
  recentTransactions: AgentTransactionItem[];
  topUnrealizedGains: AgentUnrealizedPosition[];
  topUnrealizedLosses: AgentUnrealizedPosition[];
}

export interface AgentContributionPlanItem {
  key: string;
  label: string;
  suggestedAmount: number;
  currentPercent: number;
  projectedPercent: number;
  reason: string;
}

export interface AgentContributionPlan {
  hasGoals: boolean;
  contributionAmount: number;
  primaryFocusLabel?: string;
  primaryFocusSuggestedAmount?: number;
  topItems: AgentContributionPlanItem[];
  summary: string;
  totalAllocated: number;
  unallocatedAmount: number;
}

export interface AgentGoalDriftItem {
  key: string;
  label: string;
  currentPercent: number;
  targetPercent: number;
  driftPercent: number;
  status: "underweight" | "overweight" | "on_target";
}

export interface AgentGoalContext {
  hasGoals: boolean;
  monthlyContributionTarget?: number;
  /** Sum of all targetPercents */
  totalTargetPercent: number;
  topDrifts: AgentGoalDriftItem[];
  overweightLabels: string[];
  underweightLabels: string[];
}

export interface AgentHistorySummary {
  hasHistory: boolean;
  firstDate?: string;
  lastDate?: string;
  /** Number of months covered */
  periodMonths: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netContributions: number;
  totalDividends: number;
  totalFees: number;
  currentValue: number;
  estimatedGainLoss: number;
  estimatedReturnPercent: number | null;
  /** Number of monthly data points */
  pointCount: number;
}

export interface AgentScenarioDriftChange {
  key: string;
  label: string;
  driftBefore: number;
  driftAfter: number;
  changePP: number;
}

export interface AgentScenarioResult {
  type: string;
  label: string;
  basePortfolioValue: number;
  projectedPortfolioValue: number;
  valueChange: number;
  valueChangePercent: number;
  affectedSymbols: string[];
  affectedCategories: string[];
  topDriftChanges: AgentScenarioDriftChange[];
  summary: string;
  warnings: string[];
}

export interface AgentFxContext {
  baseCurrency: Currency;
  source: FXRateSource;
  lastUpdated?: string;
  rates: FXRate[];
}

export interface AgentOnboardingSummary {
  totalSteps: number;
  completedSteps: number;
  isComplete: boolean;
  /** Step titles that are still "warning" or "todo" */
  pendingTitles: string[];
  /** Title of the single most important next step, if any */
  nextStepTitle: string | null;
}

export interface AgentContext {
  asOf: string;
  fx: AgentFxContext;
  portfolio: AgentPortfolioContext;
  watchlist: AgentWatchlistContext;
  alerts: AgentAlertContext;
  news: AgentNewsContext;
  portfolioInsights: AgentPortfolioInsight[];
  watchlistResearch: AgentWatchlistResearchItem[];
  selectedCompanySnapshot?: AgentCompanySnapshot | null;
  actionSuggestions: ActionSuggestion[];
  dataHealthSummary: DataHealthSummary;
  riskSignals: AgentRiskSignal[];
  performance: AgentPerformanceSummary;
  portfolioHistory: AgentHistorySummary;
  goals: AgentGoalContext;
  contributionPlan: AgentContributionPlan;
  scenario: AgentScenarioResult | null;
  onboarding: AgentOnboardingSummary;
}
