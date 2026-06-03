"use client";

import { useMemo, useState } from "react";
import {
  buildAllocationDrift,
  buildContributionPlan,
  type ContributionPlanItem,
  type PortfolioGoalSettings,
} from "@/lib/goals";
import type { AllocationDrift } from "@/lib/goals";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import type { Currency } from "@/lib/portfolio/types";

// ── Sub-components ─────────────────────────────────────────────────────────────

function PlanItemRow({ item }: { item: ContributionPlanItem }) {
  const currency: Currency = "EUR";
  const hasSuggestion = item.suggestedAmount > 0;
  const maxPercent = Math.max(item.currentPercent, item.targetPercent, item.projectedPercent, 1);

  const afterColor =
    item.statusAfter === "on_target"
      ? "rgba(74,222,128,0.7)"
      : item.statusAfter === "overweight"
        ? "rgba(251,191,36,0.7)"
        : "rgba(99,102,241,0.7)";

  return (
    <div
      className="rounded-xl px-3 py-2.5 flex flex-col gap-2"
      style={{
        background: hasSuggestion ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.018)",
        border: hasSuggestion
          ? "1px solid rgba(139,92,246,0.12)"
          : "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white">{item.label}</p>
        <div className="flex items-center gap-2 shrink-0">
          {hasSuggestion && (
            <span
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: "rgba(196,181,253,0.85)" }}
            >
              +{formatCurrency(item.suggestedAmount, { currency, decimals: 0 })}
            </span>
          )}
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{
              background:
                item.statusAfter === "on_target"
                  ? "rgba(74,222,128,0.1)"
                  : item.statusAfter === "overweight"
                    ? "rgba(251,191,36,0.1)"
                    : "rgba(99,102,241,0.12)",
              color:
                item.statusAfter === "on_target"
                  ? "rgba(134,239,172,0.82)"
                  : item.statusAfter === "overweight"
                    ? "rgba(253,230,138,0.82)"
                    : "rgba(196,181,253,0.75)",
            }}
          >
            {item.statusAfter === "on_target"
              ? "kohdillaan"
              : item.statusAfter === "overweight"
                ? "yli"
                : "ali"}
          </span>
        </div>
      </div>

      {/* Bars: current → target → projected */}
      <div className="flex flex-col gap-1">
        {[
          { label: "Nyt", percent: item.currentPercent, color: "rgba(148,163,184,0.4)" },
          { label: "Tavoite", percent: item.targetPercent, color: "rgba(255,255,255,0.18)" },
          { label: "Jälkeen", percent: item.projectedPercent, color: afterColor },
        ].map(({ label, percent, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <p className="text-[8px] w-10 shrink-0 text-right" style={{ color: "rgba(148,163,184,0.4)" }}>
              {label}
            </p>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(percent / maxPercent) * 100}%`, background: color }}
              />
            </div>
            <p
              className="text-[8px] w-8 shrink-0 tabular-nums"
              style={{ color: "rgba(148,163,184,0.5)" }}
            >
              {formatNumber(percent, 1)} %
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "Selitä, miten seuraava kuukausisäästö vaikuttaisi tavoiteallokaatiooni.",
  "Mikä kategoria on eniten alipainossa tavoitteeseeni verrattuna?",
  "Miten voisin tarkistaa allokaatiotani ilman suoraa osto-/myyntipäätöstä?",
];

export default function RebalancePlannerCard({
  allocationDrift,
  goalSettings,
  onAskAgent,
  totalPortfolioValue,
}: {
  allocationDrift: AllocationDrift[];
  goalSettings: PortfolioGoalSettings;
  onAskAgent: (prompt: string) => void;
  totalPortfolioValue: number;
}) {
  const currency: Currency = "EUR";
  const defaultAmount = goalSettings.monthlyContributionTarget ?? 200;
  const [amountStr, setAmountStr] = useState(String(defaultAmount));

  const contributionAmount = Math.max(0, parseFloat(amountStr) || 0);

  const plan = useMemo(
    () =>
      buildContributionPlan(
        goalSettings,
        allocationDrift,
        totalPortfolioValue,
        contributionAmount
      ),
    [goalSettings, allocationDrift, totalPortfolioValue, contributionAmount]
  );

  const hasTargets = goalSettings.allocationTargets.length > 0;

  // ── No goals state ────────────────────────────────────────────────────────
  if (!hasTargets) {
    return (
      <div className="glass-card px-4 py-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
          Kuukausisäästön suunnittelu
        </p>
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(139,92,246,0.1)" }}
        >
          <p className="text-xs font-medium text-white mb-1">Aseta tavoitteet ensin</p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Aseta tavoiteallokaatiot &ldquo;Allokaatiotavoitteet&rdquo;-kortista niin näet, miten seuraava säästö voisi kohdentua.
          </p>
        </div>
      </div>
    );
  }

  const visibleItems = [...plan.items]
    .sort((a, b) => b.suggestedAmount - a.suggestedAmount || Math.abs(b.driftPercent) - Math.abs(a.driftPercent))
    .slice(0, 5);

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
            Kuukausisäästön suunnittelu
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Miten talletus voisi lähentää tavoiteallokaatiota
          </p>
        </div>
      </div>

      {/* Amount input */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 flex-1">
          <span className="text-[10px] text-white shrink-0">Talletus (€)</span>
          <input
            type="number"
            min="0"
            step="50"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="flex-1 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40 tabular-nums"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(148,163,184,0.12)",
            }}
          />
        </label>
        {plan.unallocatedAmount > 0.5 && (
          <p className="text-[10px] shrink-0" style={{ color: "rgba(148,163,184,0.45)" }}>
            {formatCurrency(plan.unallocatedAmount, { currency, decimals: 0 })} kohdentamatta
          </p>
        )}
      </div>

      {/* Summary */}
      {contributionAmount > 0 && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(139,92,246,0.1)",
          }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: "rgba(196,181,253,0.78)" }}>
            {plan.summary}
          </p>
        </div>
      )}

      {/* Plan items */}
      {contributionAmount > 0 && visibleItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.38)" }}>
            Ehdotettu kohdentaminen
          </p>
          {visibleItems.map((item) => (
            <PlanItemRow key={item.key} item={item} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[9px] leading-relaxed" style={{ color: "rgba(148,163,184,0.3)" }}>
        Suunnitelma perustuu tavoiteallokaatioon eikä ole sijoitusneuvontaa. Vertaa tilannettasi ennen päätöksiä.
      </p>

      {/* CTA */}
      {contributionAmount > 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.slice(0, 2).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onAskAgent(prompt)}
              className="rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors hover:bg-white/[0.06] text-left"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "rgba(148,163,184,0.65)",
                border: "1px solid rgba(148,163,184,0.08)",
              }}
            >
              {prompt.length > 55 ? `${prompt.slice(0, 52)}…` : prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
