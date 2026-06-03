import { calculateAllocationByAssetType } from "@/lib/portfolio";
import type { FXRateMap } from "@/lib/currency";
import type { AssetType, Portfolio } from "@/lib/portfolio";

/** Chart colour per asset type — preserves the original dashboard palette. */
const SEGMENT_COLORS: Record<AssetType, string> = {
  stock: "#6366f1",
  etf: "#8b5cf6",
  cash: "#22d3ee",
  commodity: "#3b82f6",
  crypto: "#f59e0b",
  bond: "#10b981",
  other: "#64748b",
};

interface Segment {
  label: string;
  pct: number;
  color: string;
}

function DonutChart({
  segments,
  centerPct,
  centerLabel,
}: {
  segments: Segment[];
  centerPct: number;
  centerLabel: string;
}) {
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  // Pre-compute rotation offsets to avoid mutating a variable inside JSX.
  const segmentsWithRotation = segments.reduce<
    Array<{ seg: Segment; dash: number; gap: number; rotation: number }>
  >((acc, seg) => {
    const prevCumulative = acc.reduce((sum, s) => sum + s.seg.pct, 0);
    const dash = (seg.pct / 100) * circumference;
    const gap = circumference - dash;
    const rotation = (prevCumulative / 100) * 360 - 90;
    acc.push({ seg, dash, gap, rotation });
    return acc;
  }, []);

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
      {segmentsWithRotation.map(({ seg, dash, gap, rotation }, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth="14"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={0}
          transform={`rotate(${rotation} ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
        {centerPct}%
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="8">
        {centerLabel}
      </text>
    </svg>
  );
}

export default function AllocationCard({
  portfolio,
  rates,
}: {
  portfolio: Portfolio;
  rates?: FXRateMap;
}) {
  const allocation = calculateAllocationByAssetType(portfolio, rates);
  const segments: Segment[] = allocation.map((item) => ({
    label: item.label,
    pct: item.percent,
    color: SEGMENT_COLORS[item.type],
  }));

  // Largest slice drives the donut centre label. Guard against empty portfolio.
  const top = allocation.length > 0
    ? allocation.reduce(
        (max, item) => (item.percent > max.percent ? item : max),
        allocation[0]
      )
    : null;

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
        Salkun jakauma
      </p>

      {top === null ? (
        <div
          className="rounded-xl px-4 py-8 text-center text-xs"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(148,163,184,0.68)",
          }}
        >
          Ei omistuksia tai käteistä vielä.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <DonutChart
            segments={segments}
            centerPct={Math.round(top.percent)}
            centerLabel={top.label}
          />

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {segments.map((seg) => (
              <div key={seg.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                    <span className="text-xs" style={{ color: "rgba(148,163,184,0.8)" }}>{seg.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{Math.round(seg.pct)}%</span>
                </div>
                {/* Mini progress bar */}
                <div className="h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-0.5 rounded-full"
                    style={{ width: `${seg.pct}%`, background: seg.color, opacity: 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
