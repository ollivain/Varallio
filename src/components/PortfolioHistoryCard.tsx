import { formatCurrency, formatSignedCurrency, formatSignedPercent } from "@/lib/formatters";
import type { PortfolioHistoryPoint, PortfolioHistorySummary } from "@/lib/transactions";
import type { Currency } from "@/lib/portfolio/types";

// ── SVG chart ─────────────────────────────────────────────────────────────────

const VIEW_W = 480;
const VIEW_H = 120;
const PAD_LEFT = 42;
const PAD_RIGHT = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 22; // room for x-axis labels
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function formatAxisY(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

function formatAxisX(month: string): string {
  const [y, m] = month.split("-");
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m, 10)]} ${y.slice(2)}`;
}

interface ChartPoint {
  x: number;
  y: number;
  month: string;
  cumulativeNetContributions: number;
}

function buildChartPoints(
  points: PortfolioHistoryPoint[],
  currentValue: number
): { chartPoints: ChartPoint[]; maxY: number; currentY: number } {
  const maxNetContrib = Math.max(...points.map((p) => p.cumulativeNetContributions), 0);
  const maxY = Math.max(maxNetContrib, currentValue) * 1.1 || 1;

  const n = points.length;

  const chartPoints: ChartPoint[] = points.map((p, i) => ({
    x: n === 1 ? PAD_LEFT + PLOT_W / 2 : PAD_LEFT + (i / (n - 1)) * PLOT_W,
    y: PAD_TOP + PLOT_H - (p.cumulativeNetContributions / maxY) * PLOT_H,
    month: p.month,
    cumulativeNetContributions: p.cumulativeNetContributions,
  }));

  const currentY = PAD_TOP + PLOT_H - (currentValue / maxY) * PLOT_H;

  return { chartPoints, maxY, currentY };
}

/** Step-line path: horizontal then vertical at each new point. */
function buildStepPath(pts: ChartPoint[]): string {
  if (pts.length === 0) return "";
  const bottom = PAD_TOP + PLOT_H;

  // Area fill: descend to bottom at start, trace step-line, back to bottom
  const area = [
    `M ${pts[0].x},${bottom}`,
    `L ${pts[0].x},${pts[0].y}`,
    ...pts.slice(1).map((p) => `H ${p.x} V ${p.y}`),
    `H ${pts.at(-1)!.x}`,
    `V ${bottom}`,
    "Z",
  ].join(" ");

  // Stroke only
  const line = [
    `M ${pts[0].x},${pts[0].y}`,
    ...pts.slice(1).map((p) => `H ${p.x} V ${p.y}`),
    `H ${pts.at(-1)!.x}`,
  ].join(" ");

  return `${area}|||${line}`;
}

function CashFlowChart({
  points,
  currentValue,
  isGain,
}: {
  points: PortfolioHistoryPoint[];
  currentValue: number;
  isGain: boolean;
}) {
  if (points.length === 0) return null;

  const { chartPoints, maxY, currentY } = buildChartPoints(points, currentValue);
  const paths = buildStepPath(chartPoints);
  const [areaPath, linePath] = paths.split("|||");

  const valueColor = isGain ? "rgba(74,222,128,0.85)" : "rgba(248,113,113,0.85)";
  const valueDash = isGain ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)";

  const lastX = chartPoints.at(-1)!.x;
  const firstX = chartPoints[0].x;
  const bottom = PAD_TOP + PLOT_H;

  // X-axis label positions: first, middle (if ≥ 3 pts), last
  const labelIndices: number[] = [0];
  if (chartPoints.length >= 3) {
    labelIndices.push(Math.floor((chartPoints.length - 1) / 2));
  }
  if (chartPoints.length >= 2) {
    labelIndices.push(chartPoints.length - 1);
  }
  const uniqueIndices = [...new Set(labelIndices)];

  // Y-axis: 0, mid, max
  const gridValues = [0, maxY * 0.5, maxY];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height={VIEW_H}
      aria-label="Portfolio cash-flow history chart"
    >
      {/* Grid lines */}
      {gridValues.map((v) => {
        const gy = PAD_TOP + PLOT_H - (v / maxY) * PLOT_H;
        return (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              y1={gy}
              x2={PAD_LEFT + PLOT_W}
              y2={gy}
              stroke="rgba(148,163,184,0.07)"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 4}
              y={gy + 3}
              textAnchor="end"
              fontSize={8}
              fill="rgba(148,163,184,0.4)"
            >
              {formatAxisY(v)}
            </text>
          </g>
        );
      })}

      {/* Net-contributions area fill */}
      <path d={areaPath} fill="rgba(99,102,241,0.12)" />

      {/* Net-contributions step line */}
      <path
        d={linePath}
        fill="none"
        stroke="rgba(139,92,246,0.6)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Current value dashed reference line */}
      <line
        x1={firstX}
        y1={currentY}
        x2={lastX}
        y2={currentY}
        stroke={valueDash}
        strokeWidth={1}
        strokeDasharray="4 3"
      />

      {/* Current value dot at last point */}
      <circle
        cx={lastX}
        cy={currentY}
        r={4}
        fill={valueColor}
        stroke="rgba(5,8,23,0.8)"
        strokeWidth={1.5}
      />

      {/* Bottom axis baseline */}
      <line
        x1={PAD_LEFT}
        y1={bottom}
        x2={PAD_LEFT + PLOT_W}
        y2={bottom}
        stroke="rgba(148,163,184,0.1)"
        strokeWidth={1}
      />

      {/* X-axis labels */}
      {uniqueIndices.map((idx) => {
        const cp = chartPoints[idx];
        return (
          <text
            key={cp.month}
            x={cp.x}
            y={VIEW_H - 4}
            textAnchor="middle"
            fontSize={8}
            fill="rgba(148,163,184,0.4)"
          >
            {formatAxisX(cp.month)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Summary metric helpers ─────────────────────────────────────────────────────

function SummaryItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative" | "neutral";
}) {
  const color =
    accent === "positive"
      ? "rgba(134,239,172,0.88)"
      : accent === "negative"
        ? "rgba(252,165,165,0.88)"
        : "rgba(203,213,225,0.82)";

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p
        className="text-[9px] font-semibold uppercase tracking-wider"
        style={{ color: "rgba(148,163,184,0.42)" }}
      >
        {label}
      </p>
      <p
        className="text-xs font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PortfolioHistoryCard({
  historySummary,
  onAddTransaction,
  onImportCSV,
}: {
  historySummary: PortfolioHistorySummary;
  onAddTransaction: () => void;
  onImportCSV: () => void;
}) {
  const currency: Currency = "EUR";

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!historySummary.hasHistory) {
    return (
      <div className="glass-card px-4 py-4 flex flex-col gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Tuottohistoria
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Rahavirrat ajan yli
          </p>
        </div>
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-2"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(139,92,246,0.1)",
          }}
        >
          <p className="text-xs font-medium text-white">
            Lisää transaktiohistoria
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "rgba(148,163,184,0.6)" }}
          >
            Lisää ostot, talletukset ja myynnit niin Investment OS voi näyttää
            salkun rahavirrat ajan yli.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={onAddTransaction}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.07]"
              style={{
                background: "rgba(99,102,241,0.12)",
                color: "rgba(196,181,253,0.9)",
                border: "1px solid rgba(139,92,246,0.18)",
              }}
            >
              + Lisää transaktio
            </button>
            <button
              type="button"
              onClick={onImportCSV}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(148,163,184,0.75)",
                border: "1px solid rgba(148,163,184,0.1)",
              }}
            >
              Tuo CSV
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Data card ──────────────────────────────────────────────────────────────
  const isGain = historySummary.estimatedGainLoss >= 0;
  const returnAccent: "positive" | "negative" | "neutral" =
    historySummary.estimatedGainLoss > 0
      ? "positive"
      : historySummary.estimatedGainLoss < 0
        ? "negative"
        : "neutral";

  const returnStr =
    historySummary.estimatedReturnPercent !== null
      ? `${formatSignedCurrency(historySummary.estimatedGainLoss, { currency })} (${formatSignedPercent(historySummary.estimatedReturnPercent)})`
      : formatSignedCurrency(historySummary.estimatedGainLoss, { currency });

  const periodLabel =
    historySummary.periodMonths === 1
      ? "1 kk"
      : `${historySummary.periodMonths} kk`;

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Tuottohistoria
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            {historySummary.firstDate
              ? `${historySummary.firstDate} – tänään`
              : "Rahavirrat ajan yli"}
          </p>
        </div>
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
          style={{
            background: "rgba(148,163,184,0.08)",
            color: "rgba(148,163,184,0.55)",
          }}
        >
          {periodLabel}
        </span>
      </div>

      {/* Chart */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <CashFlowChart
          points={historySummary.points}
          currentValue={historySummary.currentValue}
          isGain={isGain}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px]" style={{ color: "rgba(148,163,184,0.45)" }}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-px inline-block" style={{ background: "rgba(139,92,246,0.7)" }} />
          Nettotalletukset
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: isGain ? "rgba(74,222,128,0.85)" : "rgba(248,113,113,0.85)" }}
          />
          Arvo nyt
        </span>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <SummaryItem
          label="Talletukset"
          value={formatCurrency(historySummary.totalDeposits, { currency })}
        />
        <SummaryItem
          label="Nostot"
          value={formatCurrency(historySummary.totalWithdrawals, { currency })}
        />
        <SummaryItem
          label="Arvo nyt"
          value={formatCurrency(historySummary.currentValue, { currency })}
        />
        <SummaryItem
          label="Arvioitu tuotto"
          value={returnStr}
          accent={returnAccent}
        />
        <SummaryItem
          label="Osingot"
          value={formatCurrency(historySummary.totalDividends, { currency })}
          accent={historySummary.totalDividends > 0 ? "positive" : "neutral"}
        />
        <SummaryItem
          label="Kulut"
          value={formatCurrency(historySummary.totalFees, { currency })}
          accent={historySummary.totalFees > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Disclaimer */}
      <p
        className="text-[9px] leading-relaxed"
        style={{ color: "rgba(148,163,184,0.32)" }}
      >
        Arvio perustuu rahavirtoihin (talletukset, nostot) ja nykyiseen markkina-arvoon — ei
        historialliseen hintadataan. Violetti viiva = nettotalletukset ajan yli. Piste = arvo tänään.
      </p>
    </div>
  );
}
