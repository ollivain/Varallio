import type { PriceAlert } from "@/lib/alerts";
import {
  buildPortfolioInsights,
  type Portfolio,
  type PortfolioInsightCategory,
  type PortfolioInsightSeverity,
} from "@/lib/portfolio";
import type { NewsItem, NewsProviderSource } from "@/lib/news";
import type { AllocationDrift, ContributionPlan } from "@/lib/goals";
import type { PortfolioHistorySummary, PortfolioPerformance } from "@/lib/transactions";
import type { Watchlist } from "@/lib/watchlist";
import type { FXRateMap } from "@/lib/currency";

const SEVERITY_LABELS: Record<PortfolioInsightSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  positive: "Positive",
  neutral: "Neutral",
};

const SEVERITY_COLORS: Record<PortfolioInsightSeverity, { background: string; color: string }> = {
  critical: {
    background: "rgba(248,113,113,0.16)",
    color: "rgba(254,202,202,0.95)",
  },
  warning: {
    background: "rgba(251,191,36,0.13)",
    color: "rgba(253,230,138,0.9)",
  },
  positive: {
    background: "rgba(74,222,128,0.12)",
    color: "rgba(134,239,172,0.9)",
  },
  neutral: {
    background: "rgba(99,102,241,0.14)",
    color: "rgba(196,181,253,0.82)",
  },
};

const CATEGORY_LABELS: Record<PortfolioInsightCategory, string> = {
  alerts: "Alerts",
  allocation: "Allocation",
  cash: "Cash",
  diversification: "Diversification",
  news: "News",
  performance: "Performance",
  risk: "Risk",
};

export default function PortfolioInsightsCard({
  alerts,
  allocationDrift,
  contributionPlan,
  historySummary,
  news,
  newsSource,
  performance,
  portfolio,
  rates,
  watchlist,
}: {
  alerts: PriceAlert[];
  allocationDrift?: AllocationDrift[];
  contributionPlan?: ContributionPlan;
  historySummary?: PortfolioHistorySummary;
  news: NewsItem[];
  newsSource: NewsProviderSource;
  performance?: PortfolioPerformance;
  portfolio: Portfolio;
  rates?: FXRateMap;
  watchlist: Watchlist;
}) {
  const insights = buildPortfolioInsights({
    alerts,
    allocationDrift,
    contributionPlan,
    historySummary,
    news,
    newsProviderSource: newsSource,
    performance,
    portfolio,
    rates,
    watchlist,
  }).slice(0, 6);

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
            Portfolio insights
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Automaattiset havainnot nykyisestä dashboard-datasta
          </p>
        </div>
        {insights.length > 0 ? (
          <span
            className="rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(255,255,255,0.035)",
              color: "rgba(148,163,184,0.68)",
            }}
          >
            {insights.length} havaintoa
          </span>
        ) : null}
      </div>

      {insights.length === 0 ? (
        <div
          className="rounded-xl px-4 py-8 text-center text-xs"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(148,163,184,0.68)",
          }}
        >
          Ei havaintoja tällä hetkellä.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {insights.map((insight) => {
          const severity = SEVERITY_COLORS[insight.severity];

          return (
            <div
              key={insight.id}
              className="rounded-xl px-3 py-3 flex flex-col gap-2 min-w-0"
              style={{
                background: "rgba(255,255,255,0.026)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    background: severity.background,
                    color: severity.color,
                  }}
                >
                  {SEVERITY_LABELS[insight.severity]}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    color: "rgba(148,163,184,0.68)",
                  }}
                >
                  {CATEGORY_LABELS[insight.category]}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-snug">{insight.title}</p>
                <p className="text-[10px] leading-relaxed mt-1" style={{ color: "rgba(148,163,184,0.72)" }}>
                  {insight.description}
                </p>
              </div>

              {insight.metricValue ? (
                <div className="mt-auto">
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.45)" }}>
                    {insight.metricLabel ?? "Metric"}
                  </p>
                  <p className="text-[13px] font-semibold text-white">{insight.metricValue}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
