import { calculateWatchlistRows, type Watchlist } from "@/lib/watchlist";
import { formatCurrency, formatSignedPercent } from "@/lib/formatters";

export default function WatchlistCard({
  onManage,
  watchlist,
}: {
  onManage: () => void;
  watchlist: Watchlist;
}) {
  const stocks = calculateWatchlistRows(watchlist).slice(0, 4);

  return (
    <div className="glass-card px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.55)" }}>
          Seurantalista
        </p>
        <button
          type="button"
          onClick={onManage}
          className="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/[0.05]"
          style={{ color: "rgba(196,181,253,0.82)" }}
        >
          Hallinnoi
        </button>
      </div>

      {stocks.length > 0 ? (
        <>
          <div className="flex flex-col">
            {/* Table header */}
            <div className="grid grid-cols-3 pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[11px]" style={{ color: "rgba(100,116,139,0.7)" }}>Nimi</span>
              <span className="text-[11px] text-right" style={{ color: "rgba(100,116,139,0.7)" }}>Hinta</span>
              <span className="text-[11px] text-right" style={{ color: "rgba(100,116,139,0.7)" }}>Muutos</span>
            </div>

            {/* Rows */}
            {stocks.map((s, i) => (
              <div
                key={s.id}
                className="grid grid-cols-3 py-2 transition-colors hover:bg-white/[0.03] rounded"
                style={{ borderBottom: i < stocks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
              >
                <span className="text-xs font-semibold text-white truncate pr-1">{s.name}</span>
                <span className="text-xs text-right" style={{ color: "rgba(203,213,225,0.85)" }}>
                  {formatCurrency(s.price, { currency: s.currency, decimals: 2 })}
                </span>
                <span
                  className="text-xs font-semibold text-right"
                  style={{ color: s.changePercent >= 0 ? "#4ade80" : "#f87171" }}
                >
                  {formatSignedPercent(s.changePercent)}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onManage}
            className="text-[11px] font-medium text-left mt-0.5 transition-opacity hover:opacity-80"
            style={{ color: "rgba(139,92,246,0.85)" }}
          >
            Näytä kaikki →
          </button>
        </>
      ) : (
        <div
          className="rounded-xl px-4 py-8 text-center text-xs"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(148,163,184,0.68)",
          }}
        >
          Seurantalista on tyhjä.
        </div>
      )}
    </div>
  );
}
