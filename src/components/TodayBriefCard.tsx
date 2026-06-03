import { buildPortfolioInsights, type Portfolio } from "@/lib/portfolio";
import { buildActionSuggestions } from "@/lib/actions";
import { buildNewsInsights } from "@/lib/news";
import { calculateAlertRows } from "@/lib/alerts";
import type { PriceAlert } from "@/lib/alerts";
import type { DataHealthOverallStatus, DataHealthSummary } from "@/lib/dataStatus";
import type { NewsItem, NewsProviderSource } from "@/lib/news";
import { buildWatchlistResearch, type Watchlist } from "@/lib/watchlist";
import type { FXRateMap } from "@/lib/currency";

const HEALTH_LABEL: Record<DataHealthOverallStatus, string> = {
  healthy: "Healthy",
  partial: "Partial",
  stale: "Stale",
  mock: "Demo data",
  unknown: "Unknown",
};

const HEALTH_COLOR: Record<DataHealthOverallStatus, string> = {
  healthy: "rgba(134,239,172,0.9)",
  partial: "rgba(253,230,138,0.88)",
  stale: "rgba(253,230,138,0.88)",
  mock: "rgba(196,181,253,0.82)",
  unknown: "rgba(203,213,225,0.65)",
};

export default function TodayBriefCard({
  alerts,
  dataHealthSummary,
  hasPortfolioData,
  marketDataSource,
  news,
  newsSource,
  portfolio,
  rates,
  watchlist,
}: {
  alerts: PriceAlert[];
  dataHealthSummary: DataHealthSummary;
  hasPortfolioData: boolean;
  marketDataSource: "api" | "mock";
  news: NewsItem[];
  newsSource: NewsProviderSource;
  portfolio: Portfolio;
  rates?: FXRateMap;
  watchlist: Watchlist;
}) {
  const topInsight =
    buildPortfolioInsights({
      alerts,
      news,
      newsProviderSource: newsSource,
      portfolio,
      rates,
      watchlist,
    })[0] ?? null;

  const topAction =
    buildActionSuggestions({
      alerts,
      dataHealthSummary,
      marketDataSource,
      news,
      newsSource,
      portfolio,
      rates,
      watchlist,
    })[0] ?? null;

  const highPriorityNewsCount = buildNewsInsights(news, portfolio, watchlist, rates).filter(
    (n) => n.priority === "high"
  ).length;

  const triggeredAlertsCount = calculateAlertRows(alerts, portfolio, watchlist).filter(
    (a) => a.status === "triggered"
  ).length;

  const watchlistHighPriorityCount = buildWatchlistResearch(watchlist, news, portfolio, rates).filter(
    (r) => r.priority === "high"
  ).length;

  const healthColor = HEALTH_COLOR[dataHealthSummary.overallStatus];
  const healthLabel = HEALTH_LABEL[dataHealthSummary.overallStatus];
  const notLiveCount = dataHealthSummary.items.filter(
    (item) => item.status === "stale" || item.status === "unknown"
  ).length;

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: "linear-gradient(135deg, rgba(18,22,46,0.92) 0%, rgba(10,14,32,0.92) 100%)",
        border: "1px solid rgba(139,92,246,0.1)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#a78bfa" }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(148,163,184,0.42)" }}
        >
          Päivän tilannekuva
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Data health */}
        <div className="flex flex-col gap-1">
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(100,116,139,0.62)" }}
          >
            Data
          </p>
          <p className="text-sm font-semibold leading-none" style={{ color: healthColor }}>
            {healthLabel}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: "rgba(100,116,139,0.52)" }}>
            {notLiveCount > 0 ? `${notLiveCount} päivittämättä` : "Kaikki OK"}
          </p>
        </div>

        {/* Top insight */}
        <div className="flex flex-col gap-1">
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(100,116,139,0.62)" }}
          >
            Tärkein havainto
          </p>
          {topInsight ? (
            <p className="text-xs font-medium leading-snug" style={{ color: "rgba(203,213,225,0.88)" }}>
              {topInsight.title}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>
              –
            </p>
          )}
        </div>

        {/* Triggered alerts */}
        <div className="flex flex-col gap-1">
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(100,116,139,0.62)" }}
          >
            Lauenneet
          </p>
          <p className="text-[18px] font-bold text-white leading-none">{triggeredAlertsCount}</p>
          <p className="text-[9px] mt-0.5" style={{ color: "rgba(100,116,139,0.52)" }}>
            {triggeredAlertsCount === 1 ? "hälytys" : "hälytystä"}
          </p>
        </div>

        {/* High priority news */}
        <div className="flex flex-col gap-1">
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(100,116,139,0.62)" }}
          >
            Tärkeät uutiset
          </p>
          <p className="text-[18px] font-bold text-white leading-none">{highPriorityNewsCount}</p>
          <p className="text-[9px] mt-0.5" style={{ color: "rgba(100,116,139,0.52)" }}>
            high priority
          </p>
        </div>
      </div>

      {watchlistHighPriorityCount > 0 ? (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.12)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-3 h-3 shrink-0"
            stroke="rgba(254,202,202,0.8)"
            strokeWidth={2.5}
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px]" style={{ color: "rgba(254,202,202,0.78)" }}>
            <span className="font-semibold">Watchlist: </span>
            {watchlistHighPriorityCount}{" "}
            {watchlistHighPriorityCount === 1 ? "kohde vaatii huomiota" : "kohdetta vaatii huomiota"}
          </p>
        </div>
      ) : null}

      {!hasPortfolioData && (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: "rgba(99,102,241,0.07)",
            border: "1px solid rgba(139,92,246,0.1)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-3 h-3 shrink-0"
            stroke="#a78bfa"
            strokeWidth={2.5}
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px]" style={{ color: "rgba(196,181,253,0.78)" }}>
            Käyttöönotto kesken — tuo transaktiot tai lisää ensimmäinen omistus.
          </p>
        </div>
      )}

      {topAction ? (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: "rgba(99,102,241,0.07)",
            border: "1px solid rgba(139,92,246,0.1)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-3 h-3 shrink-0"
            stroke="#a78bfa"
            strokeWidth={2.5}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <p className="text-[11px] leading-snug" style={{ color: "rgba(196,181,253,0.78)" }}>
            <span className="font-semibold">Seuraava askel: </span>
            {topAction.title}
          </p>
        </div>
      ) : null}
    </div>
  );
}
