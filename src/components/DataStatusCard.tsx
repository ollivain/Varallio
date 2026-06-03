import type {
  DataFreshnessStatus,
  DataHealthOverallStatus,
  DataHealthSummary,
  DataSourceKind,
} from "@/lib/dataStatus";

const OVERALL_LABELS: Record<DataHealthOverallStatus, string> = {
  healthy: "Healthy",
  mock: "Mock",
  partial: "Partial",
  stale: "Stale",
  unknown: "Unknown",
};

const STATUS_COLORS: Record<DataFreshnessStatus | DataHealthOverallStatus, { background: string; color: string }> = {
  error: {
    background: "rgba(248,113,113,0.16)",
    color: "rgba(254,202,202,0.95)",
  },
  fresh: {
    background: "rgba(74,222,128,0.12)",
    color: "rgba(134,239,172,0.9)",
  },
  healthy: {
    background: "rgba(74,222,128,0.12)",
    color: "rgba(134,239,172,0.9)",
  },
  mock: {
    background: "rgba(99,102,241,0.14)",
    color: "rgba(196,181,253,0.82)",
  },
  partial: {
    background: "rgba(251,191,36,0.12)",
    color: "rgba(253,230,138,0.88)",
  },
  stale: {
    background: "rgba(251,191,36,0.12)",
    color: "rgba(253,230,138,0.88)",
  },
  static: {
    background: "rgba(251,191,36,0.12)",
    color: "rgba(253,230,138,0.88)",
  },
  unknown: {
    background: "rgba(148,163,184,0.12)",
    color: "rgba(203,213,225,0.72)",
  },
};

const SOURCE_LABELS: Record<DataSourceKind, string> = {
  fallback: "fallback",
  live: "live",
  mock: "mock",
  static: "static",
  unknown: "unknown",
};

function formatLastUpdated(value: string | undefined): string {
  if (!value) return "Not refreshed";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("fi-FI", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}

export default function DataStatusCard({ summary }: { summary: DataHealthSummary }) {
  const overallColors = STATUS_COLORS[summary.overallStatus];

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
            Data status
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Lähteet ja päivitysajat
          </p>
        </div>
        <span
          className="rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wider"
          style={{
            background: overallColors.background,
            color: overallColors.color,
          }}
        >
          {OVERALL_LABELS[summary.overallStatus]}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {summary.items.map((item) => {
          const statusColors = STATUS_COLORS[item.status];

          return (
            <div
              key={item.key}
              className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5 min-w-0"
              style={{
                background: "rgba(255,255,255,0.026)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white truncate">{item.label}</p>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shrink-0"
                  style={{
                    background: statusColors.background,
                    color: statusColors.color,
                  }}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-[10px] leading-relaxed" style={{ color: "rgba(148,163,184,0.68)" }}>
                {item.message}
              </p>

              <div className="flex items-center justify-between gap-2 text-[9px]" style={{ color: "rgba(148,163,184,0.48)" }}>
                <span>{SOURCE_LABELS[item.source]}</span>
                <span>{formatLastUpdated(item.lastUpdated)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="text-[9px] leading-relaxed"
        style={{ color: "rgba(148,163,184,0.42)" }}
      >
        FX käyttää live-kursseja kun saatavilla. Static fallback pitää EUR-muunnokset
        toiminnassa, mutta cross-currency luvut ovat silloin arvioita.
      </p>
    </div>
  );
}
