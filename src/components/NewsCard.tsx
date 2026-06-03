import {
  buildNewsInsights,
  summarizeNewsInsights,
  type NewsItem,
  type NewsPriority,
  type NewsProviderSource,
  type NewsSentiment,
} from "@/lib/news";
import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";
import type { FXRateMap } from "@/lib/currency";

const SENTIMENT_LABELS: Record<NewsSentiment, string> = {
  positive: "positive",
  neutral: "neutral",
  negative: "negative",
};

const SENTIMENT_COLORS: Record<NewsSentiment, { background: string; color: string }> = {
  positive: {
    background: "rgba(74,222,128,0.12)",
    color: "rgba(134,239,172,0.9)",
  },
  neutral: {
    background: "rgba(99,102,241,0.14)",
    color: "rgba(167,139,250,0.8)",
  },
  negative: {
    background: "rgba(248,113,113,0.12)",
    color: "rgba(254,202,202,0.9)",
  },
};

const PRIORITY_LABELS: Record<NewsPriority, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

const PRIORITY_COLORS: Record<NewsPriority, { background: string; color: string }> = {
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

export default function NewsCard({
  news,
  newsSource = "mock",
  onManage,
  portfolio,
  rates,
  watchlist,
}: {
  news: NewsItem[];
  newsSource?: NewsProviderSource;
  onManage: () => void;
  portfolio: Portfolio;
  rates?: FXRateMap;
  watchlist: Watchlist;
}) {
  const insights = buildNewsInsights(news, portfolio, watchlist, rates);
  const summary = summarizeNewsInsights(insights);
  const rows = insights.slice(0, 5);

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
            Uutiset
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Salkuun vaikuttavat uutiset
          </p>
        </div>
        <div className="flex items-center gap-2">
          {newsSource === "mock" ? (
            <span
              className="rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
              style={{
                background: "rgba(99,102,241,0.12)",
                color: "rgba(196,181,253,0.82)",
              }}
            >
              demo
            </span>
          ) : null}
          <button
            type="button"
            onClick={onManage}
            className="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/[0.05]"
            style={{ color: "rgba(196,181,253,0.82)" }}
          >
            Hallinnoi
          </button>
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-2 rounded-xl px-3 py-2"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.045)",
        }}
      >
        <div>
          <p className="text-[13px] font-semibold text-white">{summary.highPriorityCount}</p>
          <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            high priority
          </p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">{summary.negativePortfolioCount}</p>
          <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            neg. portfolio
          </p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">{summary.watchlistUpdateCount}</p>
          <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            watchlist
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        {rows.length > 0 ? (
          rows.map((item, index) => {
            const badge = item.sentiment
              ? {
                  label: SENTIMENT_LABELS[item.sentiment],
                  ...SENTIMENT_COLORS[item.sentiment],
                }
              : {
                  label: item.tickers?.[0] ?? "Yleinen",
                  background: "rgba(99,102,241,0.14)",
                  color: "rgba(167,139,250,0.8)",
                };
            const priorityBadge = PRIORITY_COLORS[item.priority];

            return (
              <div
                key={item.id}
                className="flex flex-col gap-1.5 py-3 cursor-pointer transition-colors hover:bg-white/[0.02] rounded-lg px-1 -mx-1"
                style={{
                  borderBottom:
                    index < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <p className="text-xs text-white leading-relaxed font-medium line-clamp-2">{item.title}</p>
                {item.summary ? (
                  <p
                    className="text-[11px] leading-relaxed line-clamp-2"
                    style={{ color: "rgba(148,163,184,0.72)" }}
                  >
                    {item.summary}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: priorityBadge.background,
                      color: priorityBadge.color,
                    }}
                  >
                    {PRIORITY_LABELS[item.priority]}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: badge.background,
                      color: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[10px]" style={{ color: "rgba(100,116,139,0.6)" }}>
                    {item.source} · {item.timeLabel}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(203,213,225,0.62)" }}>
                  {item.reason}
                </p>
                {item.impactTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.impactTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                        style={{
                          background: "rgba(255,255,255,0.035)",
                          color: "rgba(148,163,184,0.68)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {item.tickers?.length || item.url ? (
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] truncate"
                      style={{ color: "rgba(148,163,184,0.5)" }}
                    >
                      {item.tickers?.length ? item.tickers.join(", ") : "Yleinen uutinen"}
                    </span>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-medium transition-opacity hover:opacity-80 shrink-0"
                        style={{ color: "rgba(196,181,253,0.78)" }}
                      >
                        Avaa lähde
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div
            className="rounded-xl px-4 py-8 text-center text-xs"
            style={{
              background: "rgba(255,255,255,0.025)",
              color: "rgba(148,163,184,0.68)",
            }}
          >
            Ei uutisia vielä.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onManage}
        className="text-[11px] font-medium text-left transition-opacity hover:opacity-80"
        style={{ color: "rgba(139,92,246,0.8)" }}
      >
        Näytä kaikki uutiset →
      </button>
    </div>
  );
}
