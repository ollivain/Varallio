"use client";

import { useEffect, useState } from "react";
import type { AllocationTarget, PortfolioGoalSettings } from "@/lib/goals";
import { ASSET_TYPE_KEYS, sumTargetPercents } from "@/lib/goals";
import { ASSET_TYPE_LABELS } from "@/lib/portfolio/calculations";

// All asset-type rows the user can configure
const ALL_ROWS: { key: string; label: string }[] = ASSET_TYPE_KEYS.map((key) => ({
  key,
  label: ASSET_TYPE_LABELS[key],
}));

type PercentMap = Record<string, string>; // key → percent string

function goalsToMap(targets: AllocationTarget[]): PercentMap {
  const map: PercentMap = {};
  for (const t of targets) {
    map[t.key] = String(t.targetPercent);
  }
  return map;
}

function mapToTargets(map: PercentMap): AllocationTarget[] {
  return Object.entries(map)
    .map(([key, val]) => {
      const pct = parseFloat(val);
      const row = ALL_ROWS.find((r) => r.key === key);
      return {
        id: `target-${key}`,
        label: row?.label ?? key,
        category: key === "cash" ? ("cash" as const) : ("assetType" as const),
        key,
        targetPercent: isFinite(pct) && pct >= 0 ? pct : 0,
      };
    })
    .filter((t) => t.targetPercent > 0); // only keep non-zero targets
}

export default function EditGoalsModal({
  goalSettings,
  isOpen,
  onClose,
  onSave,
}: {
  goalSettings: PortfolioGoalSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: PortfolioGoalSettings) => void;
}) {
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [percentMap, setPercentMap] = useState<PercentMap>({});

  useEffect(() => {
    if (!isOpen) return;
    setMonthlyTarget(
      goalSettings.monthlyContributionTarget != null
        ? String(goalSettings.monthlyContributionTarget)
        : ""
    );
    setPercentMap(goalsToMap(goalSettings.allocationTargets));
  }, [isOpen, goalSettings]);

  if (!isOpen) return null;

  function setPercent(key: string, value: string) {
    setPercentMap((prev) => ({ ...prev, [key]: value }));
  }

  const draftTargets = mapToTargets(percentMap);
  const totalPercent = draftTargets.reduce((s, t) => s + t.targetPercent, 0);
  const totalWarning = Math.abs(totalPercent - 100) > 5 && totalPercent > 0;

  function handleSave() {
    const monthly = parseFloat(monthlyTarget);
    onSave({
      monthlyContributionTarget: isFinite(monthly) && monthly > 0 ? monthly : undefined,
      allocationTargets: mapToTargets(percentMap),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(18,21,31,0.98), rgba(8,13,25,0.98))",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.5)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Muokkaa tavoitteita</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
              Aseta tavoiteallokaatiot ja kuukausisäästötavoite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
            style={{ color: "rgba(203,213,225,0.75)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5">

          {/* Monthly target */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
              Kuukausisäästötavoite (€, valinnainen)
            </span>
            <input
              type="number"
              min="0"
              step="50"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
              placeholder="esim. 1000"
              className="rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(148,163,184,0.12)",
              }}
            />
          </label>

          {/* Allocation targets */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
                Tavoiteallokaatiot (%)
              </span>
              <span className="text-[9px]" style={{ color: totalWarning ? "rgba(253,230,138,0.75)" : "rgba(148,163,184,0.4)" }}>
                Yhteensä: {totalPercent.toFixed(0)} %
              </span>
            </div>

            {ALL_ROWS.map(({ key, label }) => {
              const val = percentMap[key] ?? "0";
              return (
                <div key={key} className="flex items-center gap-3">
                  <p className="text-xs text-white w-28 shrink-0">{label}</p>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={val}
                    onChange={(e) => setPercent(key, e.target.value)}
                    className="w-20 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40 tabular-nums"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(148,163,184,0.12)",
                    }}
                  />
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(parseFloat(val) || 0, 100)}%`,
                        background: "rgba(139,92,246,0.5)",
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {totalWarning && (
              <div
                className="rounded-lg px-3 py-2 mt-1"
                style={{
                  background: "rgba(251,191,36,0.07)",
                  border: "1px solid rgba(251,191,36,0.12)",
                }}
              >
                <p className="text-[10px]" style={{ color: "rgba(253,230,138,0.82)" }}>
                  Tavoitteiden summa on {totalPercent.toFixed(0)} % — hyvä tavoite on ~100 %. Voit silti tallentaa.
                </p>
              </div>
            )}

            <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.38)" }}>
              0 % = ei tavoitetta tälle kategorialle. Nolla-arvoisia ei tallenneta.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/[0.05]"
            style={{
              background: "rgba(255,255,255,0.025)",
              color: "rgba(203,213,225,0.7)",
            }}
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-violet-600/30"
            style={{
              background: "rgba(99,102,241,0.18)",
              color: "rgba(196,181,253,0.95)",
              border: "1px solid rgba(139,92,246,0.22)",
            }}
          >
            Tallenna tavoitteet
          </button>
        </div>
      </div>
    </div>
  );
}
