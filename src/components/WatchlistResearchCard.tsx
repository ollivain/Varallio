import {
  buildWatchlistResearch,
  type WatchlistResearchPriority,
  type WatchlistResearchSentiment,
} from "@/lib/watchlist";
import type { NewsItem } from "@/lib/news";
import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";
import { formatCurrency, formatSignedPercent } from "@/lib/formatters";
import type { FXRateMap } from "@/lib/currency";

// ── Badge colour maps ─────────────────────────────────────────────────────────

const SENTIMENT_LABELS: Record<WatchlistResearchSentiment, string> = {
  positive: "Positiivinen",
  neutral: "Neutraali",
  negative: "Negatiivinen",
  mixed: "Sekalainen",
  unknown: "Ei dataa",
};

const SENTIMENT_COLORS: Record<WatchlistResearchSentiment, { background: string; color: string }> = {
  positive: {
    background: "rgba(74,222,128,0.12)",
    color: "rgba(134,239,172,0.9)",
  },
  neutral: {
    background: "rgba(99,102,241,0.12)",
    color: "rgba(196,181,253,0.82)",
  },
  negative: {
    background: "rgba(248,113,113,0.14)",
    color: "rgba(254,202,202,0.92)",
  },
  mixed: {
    background: "rgba(251,191,36,0.12)",
    color: "rgba(253,230,138,0.88)",
  },
  unknown: {
    background: "rgba(148,163,184,0.1)",
    color: "rgba(203,213,225,0.68)",
  },
};

const PRIORITY_LABELS: Record<WatchlistResearchPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_COLORS: Record<WatchlistResearchPriority, { background: string; color: string }> = {
  high: {
    background: "rgba(248,113,113,0.14)",
    color: "rgba(254,202,202,0.92)",
  },
  medium: {
    background: "rgba(251,191,36,0.12)",
    color: "rgba(253,230,138,0.88)",
  },
  low: {
    background: "rgba(99,102,241,0.12)",
    color: "rgba(196,181,253,0.82)",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function WatchlistResearchCard({
  news,
  onAskAgent,
  onSelectSymbol,
  portfolio,
  rates,
  watchlist,
}: {
  news: NewsItem[];
  onAskAgent: (prompt: string) => void;
  onSelectSymbol?: (symbol: string) => void;
  portfolio: Portfolio;
  rates?: FXRateMap;
  watchlist: Watchlist;
}) {
  const items = buildWatchlistResearch(watchlist, news, portfolio, rates).slice(0, 6);

  const highPriorityCount = items.filter((i) => i.priority === "high").length;

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Watchlist research
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Seurantakohteiden tutkimustilannekuva
          </p>
        </div>
        <div className="flex items-center gap-2">
          {highPriorityCount > 0 ? (
            <span
              className="rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
              style={{
                background: "rgba(248,113,113,0.12)",
                color: "rgba(254,202,202,0.88)",
              }}
            >
              {highPriorityCount} high
            </span>
          ) : null}
          <span
            className="rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(255,255,255,0.035)",
              color: "rgba(148,163,184,0.68)",
            }}
          >
            {items.length} kohdetta
          </span>
        </div>
      </div>

      {/* Research items grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {items.map((item) => {
            const sentimentStyle = SENTIMENT_COLORS[item.sentiment];
            const priorityStyle = PRIORITY_COLORS[item.priority];
            const isPositiveChange = (item.changePercent ?? 0) >= 0;

            return (
              <div
                key={item.symbol}
                className="rounded-xl px-3 py-3 flex flex-col gap-2 min-w-0"
                style={{
                  background: "rgba(255,255,255,0.026)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Symbol + price row */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-none">{item.symbol}</p>
                    <p
                      className="text-[10px] leading-snug mt-0.5 truncate"
                      style={{ color: "rgba(148,163,184,0.72)" }}
                    >
                      {item.name}
                    </p>
                  </div>
                  {item.price !== undefined ? (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-white leading-none">
                        {formatCurrency(item.price, { currency: item.currency, decimals: 2 })}
                      </p>
                      {item.changePercent !== undefined ? (
                        <p
                          className="text-[9px] font-semibold mt-0.5 leading-none"
                          style={{ color: isPositiveChange ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.9)" }}
                        >
                          {formatSignedPercent(item.changePercent)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Priority + Sentiment badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      background: priorityStyle.background,
                      color: priorityStyle.color,
                    }}
                  >
                    {PRIORITY_LABELS[item.priority]}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                    style={{
                      background: sentimentStyle.background,
                      color: sentimentStyle.color,
                    }}
                  >
                    {SENTIMENT_LABELS[item.sentiment]}
                  </span>
                  {item.newsCount > 0 ? (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                      style={{
                        background: "rgba(255,255,255,0.035)",
                        color: "rgba(148,163,184,0.65)",
                      }}
                    >
                      {item.newsCount} uutista
                    </span>
                  ) : null}
                </div>

                {/* Reason */}
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: "rgba(148,163,184,0.72)" }}
                >
                  {item.reason}
                </p>

                {/* Tags */}
                {item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                        style={{
                          background: "rgba(99,102,241,0.09)",
                          color: "rgba(196,181,253,0.72)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* CTAs */}
                <div className="mt-auto flex items-center gap-2 flex-wrap">
                  {onSelectSymbol && (
                    <button
                      type="button"
                      onClick={() => onSelectSymbol(item.symbol)}
                      className="text-[10px] font-semibold transition-opacity hover:opacity-80"
                      style={{ color: "rgba(103,232,249,0.82)" }}
                    >
                      Avaa snapshot
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onAskAgent(item.suggestedPrompt)}
                    className="text-[10px] font-semibold transition-opacity hover:opacity-80"
                    style={{ color: "rgba(196,181,253,0.86)" }}
                  >
                    Kysy agentilta →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-8 text-center text-xs"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(148,163,184,0.68)",
          }}
        >
          Watchlist on tyhjä.
        </div>
      )}
    </div>
  );
}
