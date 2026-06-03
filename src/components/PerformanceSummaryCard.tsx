import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/formatters";
import type { PortfolioPerformance } from "@/lib/transactions";
import type { Currency } from "@/lib/portfolio/types";

function MetricRow({
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
    <div className="flex items-center justify-between gap-3 min-w-0">
      <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.6)" }}>
        {label}
      </p>
      <p className="text-[11px] font-semibold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

export default function PerformanceSummaryCard({
  performance,
  onAddTransaction,
}: {
  performance: PortfolioPerformance;
  onAddTransaction: () => void;
}) {
  const currency: Currency = "EUR";

  if (!performance.hasTransactions) {
    return (
      <div className="glass-card px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "rgba(148,163,184,0.45)" }}
            >
              Performance
            </p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
              Tuottohistoria
            </p>
          </div>
        </div>
        <div
          className="rounded-xl px-4 py-3 flex flex-col gap-2"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(139,92,246,0.1)",
          }}
        >
          <p className="text-xs font-medium text-white">Lisää transaktiohistoria</p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "rgba(148,163,184,0.6)" }}
          >
            Kirjaa ostot, myynnit ja talletukset niin saat tarkan tuottolaskennan
            ja historiallisen kehityksen.
          </p>
          <button
            type="button"
            onClick={onAddTransaction}
            className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.08] mt-1"
            style={{
              background: "rgba(99,102,241,0.12)",
              color: "rgba(196,181,253,0.9)",
              border: "1px solid rgba(139,92,246,0.18)",
            }}
          >
            Lisää ensimmäinen transaktio
          </button>
        </div>
      </div>
    );
  }

  const returnAccent: "positive" | "negative" | "neutral" =
    performance.simpleGainLoss > 0
      ? "positive"
      : performance.simpleGainLoss < 0
        ? "negative"
        : "neutral";

  const returnStr =
    performance.simpleReturnPercent !== null
      ? `${formatSignedCurrency(performance.simpleGainLoss, { currency })} (${formatSignedPercent(performance.simpleReturnPercent)})`
      : formatSignedCurrency(performance.simpleGainLoss, { currency });

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Performance
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            {performance.firstTransactionDate
              ? `${performance.firstTransactionDate} – tänään`
              : "Tuottohistoria"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(148,163,184,0.1)",
              color: "rgba(148,163,184,0.6)",
            }}
          >
            {performance.transactionCount} transaktiota
          </span>
          <button
            type="button"
            onClick={onAddTransaction}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-colors hover:bg-white/[0.06]"
            style={{
              background: "rgba(99,102,241,0.1)",
              color: "rgba(196,181,253,0.82)",
              border: "1px solid rgba(139,92,246,0.14)",
            }}
          >
            + Lisää
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Return */}
        <div
          className="rounded-xl px-3 py-3 flex flex-col gap-2"
          style={{
            background: "rgba(255,255,255,0.026)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(148,163,184,0.42)" }}
          >
            Yksinkertainen tuotto
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{
              color:
                returnAccent === "positive"
                  ? "rgba(134,239,172,0.92)"
                  : returnAccent === "negative"
                    ? "rgba(252,165,165,0.92)"
                    : "rgba(203,213,225,0.9)",
            }}
          >
            {returnStr}
          </p>
          <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.42)" }}>
            (arvo + nostot − talletukset) — ei painotettu ajanjaksoittain
          </p>
        </div>

        {/* Contributions */}
        <div
          className="rounded-xl px-3 py-3 flex flex-col gap-2"
          style={{
            background: "rgba(255,255,255,0.026)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(148,163,184,0.42)" }}
          >
            Rahavirtaus
          </p>
          <div className="flex flex-col gap-1.5 mt-1">
            <MetricRow
              label="Talletukset"
              value={formatCurrency(performance.totalDeposits, { currency })}
            />
            <MetricRow
              label="Nostot"
              value={formatCurrency(performance.totalWithdrawals, { currency })}
            />
            <MetricRow
              label="Nettotalletukset"
              value={formatCurrency(performance.netContributions, { currency })}
              accent="neutral"
            />
          </div>
        </div>
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="rounded-lg px-3 py-2 flex flex-col gap-1"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(148,163,184,0.38)" }}
          >
            Osingot
          </p>
          <p
            className="text-xs font-semibold tabular-nums"
            style={{ color: "rgba(134,239,172,0.78)" }}
          >
            {formatCurrency(performance.realizedDividends, { currency })}
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-2 flex flex-col gap-1"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(148,163,184,0.38)" }}
          >
            Kulut
          </p>
          <p
            className="text-xs font-semibold tabular-nums"
            style={{ color: "rgba(252,165,165,0.72)" }}
          >
            {formatCurrency(performance.totalFees, { currency })}
          </p>
        </div>
        <div
          className="rounded-lg px-3 py-2 flex flex-col gap-1"
          style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(148,163,184,0.38)" }}
          >
            Arvo nyt
          </p>
          <p
            className="text-xs font-semibold tabular-nums"
            style={{ color: "rgba(203,213,225,0.82)" }}
          >
            {formatCurrency(performance.currentPortfolioValue, { currency })}
          </p>
        </div>
      </div>

      {/* Top unrealized positions */}
      {(performance.topUnrealizedGains.length > 0 ||
        performance.topUnrealizedLosses.length > 0) && (
        <div className="flex flex-col gap-1.5">
          <p
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(148,163,184,0.38)" }}
          >
            Realisoimaton kehitys (transaktiohinnoista)
          </p>
          <div className="flex flex-col gap-1">
            {performance.topUnrealizedGains.map((p) => (
              <div
                key={`gain-${p.symbol}`}
                className="flex items-center justify-between gap-2"
              >
                <p
                  className="text-[10px] font-medium"
                  style={{ color: "rgba(203,213,225,0.7)" }}
                >
                  {p.symbol}
                </p>
                <p
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: "rgba(134,239,172,0.82)" }}
                >
                  +{p.unrealizedGainPercent.toFixed(1)} %
                </p>
              </div>
            ))}
            {performance.topUnrealizedLosses.map((p) => (
              <div
                key={`loss-${p.symbol}`}
                className="flex items-center justify-between gap-2"
              >
                <p
                  className="text-[10px] font-medium"
                  style={{ color: "rgba(203,213,225,0.7)" }}
                >
                  {p.symbol}
                </p>
                <p
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: "rgba(252,165,165,0.78)" }}
                >
                  {p.unrealizedGainPercent.toFixed(1)} %
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
