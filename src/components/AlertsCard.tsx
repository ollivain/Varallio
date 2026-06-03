import {
  calculateAlertRows,
  sortAlertRows,
  type AlertRow,
  type PriceAlert,
} from "@/lib/alerts";
import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";

function AlertIcon({ status }: { status: AlertRow["status"] }) {
  const isTriggered = status === "triggered";

  return (
    <div
      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
      style={{
        background: isTriggered ? "rgba(74,222,128,0.1)" : "rgba(99,102,241,0.1)",
        border: isTriggered
          ? "1px solid rgba(74,222,128,0.2)"
          : "1px solid rgba(99,102,241,0.18)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-3 h-3"
        stroke={isTriggered ? "#4ade80" : "#a78bfa"}
        strokeWidth={2.5}
      >
        {isTriggered ? (
          <polyline points="18 15 12 9 6 15" />
        ) : (
          <circle cx="12" cy="12" r="7" />
        )}
      </svg>
    </div>
  );
}

export default function AlertsCard({
  alerts,
  onManage,
  portfolio,
  watchlist,
}: {
  alerts: PriceAlert[];
  onManage: () => void;
  portfolio: Portfolio;
  watchlist: Watchlist;
}) {
  const rows = sortAlertRows(calculateAlertRows(alerts, portfolio, watchlist)).slice(0, 5);

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
            Hälytykset
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Hinta- ja muutoshälytykset
          </p>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="rounded-md px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/[0.05]"
          style={{ color: "rgba(196,181,253,0.82)" }}
        >
          Hallinnoi
        </button>
      </div>

      <div className="flex flex-col">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <div
              key={row.id}
              className="flex items-start gap-3 py-3 cursor-pointer transition-colors hover:bg-white/[0.02] rounded-lg px-1 -mx-1"
              style={{
                borderBottom:
                  index < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              <AlertIcon status={row.status} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{row.label}</p>
                  <span
                    className="text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0"
                    style={{
                      background:
                        row.status === "triggered"
                          ? "rgba(74,222,128,0.12)"
                          : "rgba(99,102,241,0.1)",
                      color:
                        row.status === "triggered"
                          ? "rgba(134,239,172,0.95)"
                          : "rgba(196,181,253,0.72)",
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: "rgba(100,116,139,0.6)" }}>
                  {row.timeLabel}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div
            className="rounded-xl px-4 py-8 text-center text-xs"
            style={{
              background: "rgba(255,255,255,0.025)",
              color: "rgba(148,163,184,0.68)",
            }}
          >
            Ei hälytyksiä vielä.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onManage}
        className="text-[11px] font-medium text-left transition-opacity hover:opacity-80"
        style={{ color: "rgba(139,92,246,0.8)" }}
      >
        Näytä kaikki hälytykset →
      </button>
    </div>
  );
}
