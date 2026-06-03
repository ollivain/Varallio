import type { PriceAlert } from "@/lib/alerts";
import type { FXRateMap } from "@/lib/currency";
import {
  buildActionSuggestions,
  type ActionSuggestionPriority,
  type ActionSuggestionType,
} from "@/lib/actions";
import type { DataHealthSummary } from "@/lib/dataStatus";
import type { AllocationDrift, ContributionPlan } from "@/lib/goals";
import type { ScenarioResult } from "@/lib/scenarios";
import type { NewsItem, NewsProviderSource } from "@/lib/news";
import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";

const PRIORITY_LABELS: Record<ActionSuggestionPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_COLORS: Record<ActionSuggestionPriority, { background: string; color: string }> = {
  high: {
    background: "rgba(248,113,113,0.14)",
    color: "rgba(254,202,202,0.92)",
  },
  medium: {
    background: "rgba(251,191,36,0.12)",
    color: "rgba(253,230,138,0.88)",
  },
  low: {
    background: "rgba(99,102,241,0.14)",
    color: "rgba(196,181,253,0.82)",
  },
};

const TYPE_LABELS: Record<ActionSuggestionType, string> = {
  ask_agent: "Ask agent",
  compare: "Compare",
  monitor: "Monitor",
  review: "Review",
  update_data: "Update data",
};

export default function ActionSuggestionsCard({
  alerts,
  allocationDrift,
  contributionPlan,
  dataHealthSummary,
  marketDataSource,
  news,
  newsSource,
  onAskAgent,
  portfolio,
  rates,
  scenarioResult,
  watchlist,
}: {
  alerts: PriceAlert[];
  allocationDrift?: AllocationDrift[];
  contributionPlan?: ContributionPlan;
  dataHealthSummary: DataHealthSummary;
  marketDataSource: "api" | "mock";
  news: NewsItem[];
  newsSource: NewsProviderSource;
  onAskAgent: (prompt: string) => void;
  portfolio: Portfolio;
  rates?: FXRateMap;
  scenarioResult?: ScenarioResult | null;
  watchlist: Watchlist;
}) {
  const suggestions = buildActionSuggestions({
    alerts,
    allocationDrift,
    contributionPlan,
    dataHealthSummary,
    marketDataSource,
    news,
    newsSource,
    portfolio,
    rates,
    scenarioResult,
    watchlist,
  }).slice(0, 5);

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
            Suggested next steps
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Tarkista, seuraa ja kysy agentilta
          </p>
        </div>
        <span
          className="rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
          style={{
            background: "rgba(255,255,255,0.035)",
            color: "rgba(148,163,184,0.68)",
          }}
        >
          {suggestions.length} toimenpidettä
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div
          className="rounded-xl px-4 py-8 text-center text-xs"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(148,163,184,0.68)",
          }}
        >
          Ei toimenpide-ehdotuksia tällä hetkellä.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {suggestions.map((suggestion) => {
          const priority = PRIORITY_COLORS[suggestion.priority];

          return (
            <div
              key={suggestion.id}
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
                    background: priority.background,
                    color: priority.color,
                  }}
                >
                  {PRIORITY_LABELS[suggestion.priority]}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.035)",
                    color: "rgba(148,163,184,0.68)",
                  }}
                >
                  {TYPE_LABELS[suggestion.type]}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-snug">{suggestion.title}</p>
                <p className="text-[10px] leading-relaxed mt-1" style={{ color: "rgba(148,163,184,0.72)" }}>
                  {suggestion.description}
                </p>
              </div>

              {suggestion.relatedSymbols?.length ? (
                <div className="flex flex-wrap gap-1">
                  {suggestion.relatedSymbols.slice(0, 4).map((symbol) => (
                    <span
                      key={symbol}
                      className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                      style={{
                        background: "rgba(99,102,241,0.11)",
                        color: "rgba(196,181,253,0.78)",
                      }}
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              ) : null}

              {suggestion.suggestedPrompt ? (
                <button
                  type="button"
                  onClick={() => onAskAgent(suggestion.suggestedPrompt ?? "")}
                  className="mt-auto text-[10px] font-semibold text-left transition-opacity hover:opacity-80"
                  style={{ color: "rgba(196,181,253,0.86)" }}
                >
                  {suggestion.ctaLabel ?? "Ask agent"}
                </button>
              ) : (
                <span className="mt-auto text-[10px] font-semibold" style={{ color: "rgba(148,163,184,0.58)" }}>
                  {suggestion.ctaLabel ?? "Review"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
