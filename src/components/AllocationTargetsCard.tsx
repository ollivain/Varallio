import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { AllocationDrift, PortfolioGoalSettings } from "@/lib/goals";
import { sumTargetPercents } from "@/lib/goals";
import type { Currency } from "@/lib/portfolio/types";

function DriftBadge({ drift }: { drift: AllocationDrift }) {
  const sign = drift.driftPercent >= 0 ? "+" : "";
  const label =
    drift.status === "overweight"
      ? "yli"
      : drift.status === "underweight"
        ? "ali"
        : "kohdillaan";
  const style =
    drift.status === "overweight"
      ? { bg: "rgba(251,191,36,0.12)", color: "rgba(253,230,138,0.88)" }
      : drift.status === "underweight"
        ? { bg: "rgba(99,102,241,0.14)", color: "rgba(196,181,253,0.82)" }
        : { bg: "rgba(74,222,128,0.1)", color: "rgba(134,239,172,0.8)" };

  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shrink-0"
      style={{ background: style.bg, color: style.color }}
    >
      {sign}{formatNumber(drift.driftPercent, 1)} pp · {label}
    </span>
  );
}

function MiniBar({
  currentPercent,
  targetPercent,
}: {
  currentPercent: number;
  targetPercent: number;
}) {
  const max = Math.max(currentPercent, targetPercent, 1) * 1.15;
  const currentW = (currentPercent / max) * 100;
  const targetW = (targetPercent / max) * 100;

  return (
    <div className="flex flex-col gap-0.5">
      {/* Current */}
      <div className="flex items-center gap-1.5">
        <p className="text-[8px] w-10 shrink-0 text-right" style={{ color: "rgba(148,163,184,0.45)" }}>
          {formatNumber(currentPercent, 1)} %
        </p>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${currentW}%`,
              background: "rgba(139,92,246,0.7)",
            }}
          />
        </div>
      </div>
      {/* Target */}
      <div className="flex items-center gap-1.5">
        <p className="text-[8px] w-10 shrink-0 text-right" style={{ color: "rgba(148,163,184,0.35)" }}>
          {formatNumber(targetPercent, 0)} %
        </p>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${targetW}%`,
              background: "rgba(148,163,184,0.25)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AllocationTargetsCard({
  allocationDrift,
  goalSettings,
  onEdit,
}: {
  allocationDrift: AllocationDrift[];
  goalSettings: PortfolioGoalSettings;
  onEdit: () => void;
}) {
  const currency: Currency = "EUR";
  const totalTarget = sumTargetPercents(goalSettings);
  const targetWarning = Math.abs(totalTarget - 100) > 5;

  const hasTargets = goalSettings.allocationTargets.length > 0;

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Allokaatiotavoitteet
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Nykyinen vs. tavoite
          </p>
        </div>
        <div className="flex items-center gap-2">
          {goalSettings.monthlyContributionTarget && (
            <span
              className="text-[9px] px-2 py-0.5 rounded"
              style={{ background: "rgba(99,102,241,0.1)", color: "rgba(196,181,253,0.6)" }}
            >
              {formatCurrency(goalSettings.monthlyContributionTarget, { currency })} / kk
            </span>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(148,163,184,0.75)",
              border: "1px solid rgba(148,163,184,0.1)",
            }}
          >
            Muokkaa
          </button>
        </div>
      </div>

      {!hasTargets ? (
        <div
          className="rounded-xl px-4 py-3"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(139,92,246,0.1)",
          }}
        >
          <p className="text-xs font-medium text-white mb-1">Ei tavoitteita asetettu</p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Aseta tavoiteallokaatio niin Investment OS voi seurata poikkeamia.
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.07]"
            style={{
              background: "rgba(99,102,241,0.12)",
              color: "rgba(196,181,253,0.9)",
              border: "1px solid rgba(139,92,246,0.18)",
            }}
          >
            Aseta tavoitteet
          </button>
        </div>
      ) : (
        <>
          {/* Target rows */}
          <div className="flex flex-col gap-2">
            {allocationDrift.map((drift) => (
              <div
                key={drift.key}
                className="rounded-xl px-3 py-2.5 flex flex-col gap-2"
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white">{drift.label}</p>
                  <DriftBadge drift={drift} />
                </div>
                <MiniBar
                  currentPercent={drift.currentPercent}
                  targetPercent={drift.targetPercent}
                />
                <div className="flex items-center justify-between gap-2 text-[9px]" style={{ color: "rgba(148,163,184,0.42)" }}>
                  <span>Nykyinen arvo: {formatCurrency(drift.currentValue, { currency })}</span>
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        drift.status === "overweight"
                          ? "rgba(253,230,138,0.7)"
                          : drift.status === "underweight"
                            ? "rgba(196,181,253,0.65)"
                            : "rgba(134,239,172,0.65)",
                    }}
                  >
                    {drift.differenceValue >= 0 ? "+" : ""}
                    {formatCurrency(drift.differenceValue, { currency })} tavoitteesta
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total target warning */}
          {targetWarning && (
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(251,191,36,0.06)",
                border: "1px solid rgba(251,191,36,0.12)",
              }}
            >
              <p className="text-[10px]" style={{ color: "rgba(253,230,138,0.75)" }}>
                Tavoitteiden summa on {formatNumber(totalTarget, 0)} % (tavoite 100 %). Muokkaa tavoitteita.
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 text-[9px]" style={{ color: "rgba(148,163,184,0.38)" }}>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1.5 rounded-full inline-block" style={{ background: "rgba(139,92,246,0.7)" }} />
              Nykyinen
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded-full inline-block" style={{ background: "rgba(148,163,184,0.25)" }} />
              Tavoite
            </span>
          </div>
        </>
      )}
    </div>
  );
}
