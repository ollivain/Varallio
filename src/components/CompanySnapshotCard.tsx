import type { CompanySnapshot, CompanySnapshotSentiment } from "@/lib/company";
import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";
import { formatCurrency, formatSignedPercent } from "@/lib/formatters";

// ── Badge colour maps ─────────────────────────────────────────────────────────

const SENTIMENT_LABELS: Record<CompanySnapshotSentiment, string> = {
  positive: "Positiivinen",
  neutral: "Neutraali",
  negative: "Negatiivinen",
  mixed: "Sekalainen",
  unknown: "Ei uutisia",
};

const SENTIMENT_COLORS: Record<
  CompanySnapshotSentiment,
  { background: string; color: string }
> = {
  positive: { background: "rgba(74,222,128,0.12)", color: "rgba(134,239,172,0.9)" },
  neutral: { background: "rgba(99,102,241,0.12)", color: "rgba(196,181,253,0.82)" },
  negative: { background: "rgba(248,113,113,0.14)", color: "rgba(254,202,202,0.92)" },
  mixed: { background: "rgba(251,191,36,0.12)", color: "rgba(253,230,138,0.88)" },
  unknown: { background: "rgba(148,163,184,0.1)", color: "rgba(203,213,225,0.68)" },
};

// ── Symbol selector chip ──────────────────────────────────────────────────────

function SymbolChip({
  symbol,
  isSelected,
  onClick,
}: {
  symbol: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors"
      style={
        isSelected
          ? {
              background: "rgba(99,102,241,0.22)",
              color: "rgba(196,181,253,0.95)",
              border: "1px solid rgba(139,92,246,0.3)",
            }
          : {
              background: "rgba(255,255,255,0.035)",
              color: "rgba(148,163,184,0.72)",
              border: "1px solid rgba(255,255,255,0.06)",
            }
      }
    >
      {symbol}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CompanySnapshotCard({
  onAskAgent,
  onSelectSymbol,
  portfolio,
  selectedSymbol,
  snapshot,
  watchlist,
}: {
  onAskAgent: (prompt: string) => void;
  onSelectSymbol: (symbol: string) => void;
  portfolio: Portfolio;
  selectedSymbol: string | null;
  snapshot: CompanySnapshot | null;
  watchlist: Watchlist;
}) {
  // Build the symbol selector list: all holdings + watchlist items, deduplicated
  const holdingSymbols = portfolio.holdings.map((h) => h.ticker);
  const watchlistSymbols = watchlist.items
    .map((i) => i.ticker)
    .filter((t) => !holdingSymbols.includes(t));
  const allSymbols = [...holdingSymbols, ...watchlistSymbols];

  const sentimentStyle = snapshot ? SENTIMENT_COLORS[snapshot.sentiment] : SENTIMENT_COLORS.unknown;

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Company snapshot
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Yksittäisen kohteen tilannekuva
          </p>
        </div>
        {/* Symbol selector chips — compact horizontal scroll */}
        {allSymbols.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[55%]">
            {allSymbols.slice(0, 9).map((sym) => (
              <SymbolChip
                key={sym}
                symbol={sym}
                isSelected={sym === selectedSymbol}
                onClick={() => onSelectSymbol(sym)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!snapshot ? (
        <div
          className="rounded-xl px-4 py-8 text-center text-xs"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(148,163,184,0.68)",
          }}
        >
          Valitse omistus tai watchlist-kohde nähdäksesi snapshotin
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* ── Symbol / name row ───────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-lg font-bold text-white leading-none shrink-0">
                  {snapshot.symbol}
                </span>
                {snapshot.name && (
                  <span className="text-sm truncate" style={{ color: "rgba(148,163,184,0.72)" }}>
                    {snapshot.name}
                  </span>
                )}
              </div>
              {/* Type badges */}
              <div className="flex items-center gap-1.5">
                {snapshot.isHolding && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "rgba(99,102,241,0.16)",
                      color: "rgba(196,181,253,0.9)",
                    }}
                  >
                    Omistus
                  </span>
                )}
                {snapshot.isWatchlist && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "rgba(34,211,238,0.1)",
                      color: "rgba(103,232,249,0.85)",
                    }}
                  >
                    Watchlist
                  </span>
                )}
                {!snapshot.isHolding && !snapshot.isWatchlist && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                    style={{
                      background: "rgba(148,163,184,0.1)",
                      color: "rgba(148,163,184,0.65)",
                    }}
                  >
                    Ei tunnistettu
                  </span>
                )}
                {snapshot.assetType && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                    style={{
                      background: "rgba(255,255,255,0.035)",
                      color: "rgba(148,163,184,0.65)",
                    }}
                  >
                    {snapshot.assetType}
                  </span>
                )}
              </div>
            </div>

            {/* Price + change */}
            {snapshot.price !== undefined && (
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-white leading-none">
                  {snapshot.currency
                    ? formatCurrency(snapshot.price, {
                        currency: snapshot.currency,
                        decimals: 2,
                      })
                    : snapshot.price.toFixed(2)}
                </p>
                {snapshot.dayChangePercent !== undefined && (
                  <p
                    className="text-xs font-semibold mt-1"
                    style={{
                      color:
                        snapshot.dayChangePercent >= 0
                          ? "rgba(74,222,128,0.9)"
                          : "rgba(248,113,113,0.9)",
                    }}
                  >
                    {formatSignedPercent(snapshot.dayChangePercent)} tänään
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Key metrics row (only for holdings) ─────────────────────────── */}
          {snapshot.isHolding && (snapshot.marketValue !== undefined || snapshot.portfolioWeight !== undefined) && (
            <div
              className="grid grid-cols-3 gap-2 rounded-xl px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.045)",
              }}
            >
              {snapshot.marketValue !== undefined && (
                <div>
                  <p className="text-[11px] font-semibold text-white">
                    {snapshot.currency
                      ? formatCurrency(snapshot.marketValue, { currency: snapshot.currency })
                      : snapshot.marketValue.toFixed(0)}
                  </p>
                  <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.55)" }}>
                    markkina-arvo
                  </p>
                </div>
              )}
              {snapshot.portfolioWeight !== undefined && (
                <div>
                  <p className="text-[11px] font-semibold text-white">
                    {snapshot.portfolioWeight.toFixed(1)} %
                  </p>
                  <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.55)" }}>
                    paino salkussa
                  </p>
                </div>
              )}
              {snapshot.totalReturnPercent !== undefined && (
                <div>
                  <p
                    className="text-[11px] font-semibold"
                    style={{
                      color:
                        snapshot.totalReturnPercent >= 0
                          ? "rgba(74,222,128,0.9)"
                          : "rgba(248,113,113,0.9)",
                    }}
                  >
                    {formatSignedPercent(snapshot.totalReturnPercent)}
                  </p>
                  <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.55)" }}>
                    kokonaistuotto
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Sentiment + news ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
              style={{
                background: sentimentStyle.background,
                color: sentimentStyle.color,
              }}
            >
              {SENTIMENT_LABELS[snapshot.sentiment]}
            </span>
            {snapshot.newsCount > 0 && (
              <span
                className="text-[10px]"
                style={{ color: "rgba(148,163,184,0.62)" }}
              >
                {snapshot.newsCount} uutista
                {snapshot.highPriorityNewsCount > 0
                  ? ` (${snapshot.highPriorityNewsCount} high priority)`
                  : ""}
              </span>
            )}
          </div>

          {/* ── Insights ─────────────────────────────────────────────────────── */}
          {snapshot.insights.length > 0 && (
            <div className="flex flex-col gap-1">
              {snapshot.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1 w-1 h-1 rounded-full shrink-0"
                    style={{ background: "rgba(139,92,246,0.5)" }}
                  />
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(203,213,225,0.82)" }}>
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Related news titles ──────────────────────────────────────────── */}
          {snapshot.relatedNewsTitles.length > 0 && (
            <div
              className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
              style={{
                background: "rgba(255,255,255,0.022)",
                border: "1px solid rgba(255,255,255,0.045)",
              }}
            >
              <p
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(100,116,139,0.65)" }}
              >
                Viimeisimmät uutiset
              </p>
              {snapshot.relatedNewsTitles.map((title, i) => (
                <p
                  key={i}
                  className="text-[11px] leading-snug"
                  style={{ color: "rgba(203,213,225,0.75)" }}
                >
                  · {title}
                </p>
              ))}
            </div>
          )}

          {/* ── Tags ──────────────────────────────────────────────────────────── */}
          {snapshot.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {snapshot.tags.map((tag) => (
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
          )}

          {/* ── CTA buttons ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5 pt-1">
            <p
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: "rgba(100,116,139,0.62)" }}
            >
              Kysy agentilta
            </p>
            <div className="flex flex-col gap-1">
              {snapshot.suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAskAgent(prompt)}
                  className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:bg-white/[0.05]"
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    color: "rgba(196,181,253,0.82)",
                    fontSize: 11,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-2.5 h-2.5 shrink-0"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
