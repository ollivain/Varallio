"use client";

import { useEffect, useMemo, useState } from "react";
import { buildScenarioResult, type ScenarioResult, type ScenarioType } from "@/lib/scenarios";
import type { AllocationDrift, PortfolioGoalSettings } from "@/lib/goals";
import type { AllocationItem, Portfolio } from "@/lib/portfolio/types";
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from "@/lib/formatters";
import type { Currency } from "@/lib/portfolio/types";
import type { FXRateMap, FXRateSource } from "@/lib/currency";

const CURRENCY: Currency = "EUR";

// ── Type selector ─────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { type: ScenarioType; label: string; subtitle: string }[] = [
  { type: "market_move", label: "Markkinaliike", subtitle: "Kaikki osakkeet ± %" },
  { type: "holding_move", label: "Yksittäinen", subtitle: "Yhden position ± %" },
  { type: "add_contribution", label: "Talletus", subtitle: "Lisätalletus salkuun" },
  { type: "cash_change", label: "Käteinen", subtitle: "Käteisen muutos" },
];

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  percentChange: string;
  symbol: string;
  amount: string;
  categoryKey: string;
}

function defaultForm(): FormState {
  return { percentChange: "-10", symbol: "", amount: "1000", categoryKey: "" };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NumberInput({
  label,
  value,
  onChange,
  step = "1",
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  unit?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40 tabular-nums"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(148,163,184,0.12)",
          }}
        />
        {unit && (
          <span className="text-[10px] shrink-0" style={{ color: "rgba(148,163,184,0.5)" }}>
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={placeholder}
        className="rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(148,163,184,0.12)",
        }}
      />
    </label>
  );
}

// ── Result display ─────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  onAskAgent,
}: {
  result: ScenarioResult;
  onAskAgent: (prompt: string) => void;
}) {
  const isGain = result.valueChange >= 0;
  const changeColor = isGain ? "rgba(134,239,172,0.88)" : "rgba(252,165,165,0.88)";

  const prompts: Record<ScenarioType, string> = {
    market_move: "Selitä tämän markkinaskenaarion vaikutus salkkuuni ja mitä riskejä kannattaa huomioida.",
    holding_move: `Selitä, miten ${result.input.symbol ?? "kohteen"} arvomuutos vaikuttaisi salkkuuni.`,
    add_contribution: "Miten tämä talletus vaikuttaisi allokaatiooni tavoitteeseeni verrattuna?",
    cash_change: "Miten käteisen muutos vaikuttaisi salkun riskiprofiiliin?",
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div
          className="rounded-xl px-3 py-2.5"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.12)",
          }}
        >
          {result.warnings.map((w) => (
            <p key={w} className="text-[11px]" style={{ color: "rgba(253,230,138,0.82)" }}>
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      {/* Value impact */}
      <div
        className="rounded-xl px-3 py-3 flex flex-col gap-2"
        style={{
          background: "rgba(255,255,255,0.022)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.4)" }}>
          Arvioitu vaikutus
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.42)" }}>Nyt</p>
            <p className="text-xs font-semibold tabular-nums text-white">
              {formatCurrency(result.basePortfolioValue, { currency: CURRENCY })}
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.42)" }}>Skenaario</p>
            <p className="text-xs font-semibold tabular-nums" style={{ color: changeColor }}>
              {formatCurrency(result.projectedPortfolioValue, { currency: CURRENCY })}
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.42)" }}>Muutos</p>
            <p className="text-xs font-semibold tabular-nums" style={{ color: changeColor }}>
              {formatSignedCurrency(result.valueChange, { currency: CURRENCY })}
              <span className="text-[9px] ml-1">
                ({formatSignedPercent(result.valueChangePercent)})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.62)" }}>
        {result.summary}
      </p>

      {/* Drift changes */}
      {result.topDriftChanges.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.4)" }}>
            Tavoitepoikkeama (ennen → jälkeen)
          </p>
          {result.topDriftChanges.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-2">
              <p className="text-[10px]" style={{ color: "rgba(203,213,225,0.7)" }}>
                {d.label}
              </p>
              <p
                className="text-[10px] font-semibold tabular-nums"
                style={{
                  color:
                    Math.abs(d.driftAfter) < Math.abs(d.driftBefore)
                      ? "rgba(134,239,172,0.75)"
                      : "rgba(253,230,138,0.75)",
                }}
              >
                {d.driftBefore >= 0 ? "+" : ""}{d.driftBefore.toFixed(1)} pp → {d.driftAfter >= 0 ? "+" : ""}{d.driftAfter.toFixed(1)} pp
              </p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={() => onAskAgent(prompts[result.input.type])}
        className="self-start rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
        style={{
          background: "rgba(255,255,255,0.03)",
          color: "rgba(148,163,184,0.65)",
          border: "1px solid rgba(148,163,184,0.08)",
        }}
      >
        Kysy agentilta tästä skenaariosta
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScenarioSimulatorCard({
  allocationDrift,
  baseAllocation,
  fxSource,
  goalSettings,
  onAskAgent,
  onScenarioResult,
  portfolio,
  rates,
}: {
  allocationDrift: AllocationDrift[];
  baseAllocation: AllocationItem[];
  fxSource?: FXRateSource;
  goalSettings?: PortfolioGoalSettings;
  onAskAgent: (prompt: string) => void;
  onScenarioResult: (result: ScenarioResult | null) => void;
  portfolio: Portfolio;
  rates?: FXRateMap;
}) {
  const [selectedType, setSelectedType] = useState<ScenarioType>("market_move");
  const [form, setForm] = useState<FormState>(defaultForm());

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Build scenario input from form
  const scenarioInput = useMemo(() => {
    const percentChange = parseFloat(form.percentChange);
    const amount = parseFloat(form.amount);
    switch (selectedType) {
      case "market_move":
        return {
          type: selectedType,
          label: `Markkinaliike ${isFinite(percentChange) ? (percentChange >= 0 ? "+" : "") + percentChange : 0} %`,
          percentChange: isFinite(percentChange) ? percentChange : 0,
        };
      case "holding_move":
        return {
          type: selectedType,
          label: `${form.symbol || "?"} ${isFinite(percentChange) ? (percentChange >= 0 ? "+" : "") + percentChange : 0} %`,
          symbol: form.symbol || undefined,
          percentChange: isFinite(percentChange) ? percentChange : 0,
        };
      case "add_contribution":
        return {
          type: selectedType,
          label: `Talletus ${isFinite(amount) ? amount : 0} €${form.categoryKey ? ` → ${form.categoryKey}` : ""}`,
          amount: isFinite(amount) ? amount : 0,
          categoryKey: form.categoryKey || undefined,
        };
      case "cash_change":
        return {
          type: selectedType,
          label: `Käteinen ${isFinite(amount) && amount >= 0 ? "+" : ""}${isFinite(amount) ? amount : 0} €`,
          amount: isFinite(amount) ? amount : 0,
        };
    }
  }, [selectedType, form]);

  // Compute result
  const scenarioResult = useMemo(() => {
    try {
      return buildScenarioResult(
        scenarioInput,
        portfolio,
        baseAllocation,
        allocationDrift,
        goalSettings,
        rates
      );
    } catch {
      return null;
    }
  }, [scenarioInput, portfolio, baseAllocation, allocationDrift, goalSettings, rates]);

  // Notify parent
  useEffect(() => {
    onScenarioResult(scenarioResult);
  }, [scenarioResult, onScenarioResult]);

  // Available categories for add_contribution dropdown
  const categoryOptions = baseAllocation
    .filter((item) => item.value > 0 || item.type === "cash")
    .map((item) => ({ key: item.type, label: item.label }));

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
          Skenaariosimulaattori
        </p>
        <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.55)" }}>
          Testaa vaikutuksia ilman, että oikea data muuttuu.
        </p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => setSelectedType(opt.type)}
            className="rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
            style={{
              background:
                selectedType === opt.type
                  ? "rgba(99,102,241,0.15)"
                  : "rgba(255,255,255,0.025)",
              border:
                selectedType === opt.type
                  ? "1px solid rgba(139,92,246,0.25)"
                  : "1px solid rgba(148,163,184,0.07)",
            }}
          >
            <p
              className="text-[11px] font-semibold"
              style={{
                color:
                  selectedType === opt.type
                    ? "rgba(196,181,253,0.95)"
                    : "rgba(203,213,225,0.7)",
              }}
            >
              {opt.label}
            </p>
            <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.45)" }}>
              {opt.subtitle}
            </p>
          </button>
        ))}
      </div>

      {/* Dynamic inputs */}
      <div className="flex flex-col gap-3">
        {selectedType === "market_move" && (
          <NumberInput
            label="Muutos kaikille osakkeille (%)"
            value={form.percentChange}
            onChange={(v) => setField("percentChange", v)}
            step="1"
            unit="%"
          />
        )}

        {selectedType === "holding_move" && (
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Symboli"
              value={form.symbol}
              onChange={(v) => setField("symbol", v)}
              placeholder="esim. NVDA"
            />
            <NumberInput
              label="Muutos (%)"
              value={form.percentChange}
              onChange={(v) => setField("percentChange", v)}
              step="1"
              unit="%"
            />
          </div>
        )}

        {selectedType === "add_contribution" && (
          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Talletuksen summa (€)"
              value={form.amount}
              onChange={(v) => setField("amount", v)}
              step="100"
              unit="€"
            />
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
                Kategoria (valinnainen)
              </span>
              <select
                value={form.categoryKey}
                onChange={(e) => setField("categoryKey", e.target.value)}
                className="rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(148,163,184,0.12)",
                }}
              >
                <option value="">Käteinen (oletus)</option>
                {categoryOptions.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {selectedType === "cash_change" && (
          <NumberInput
            label="Käteisen muutos (€, negatiivinen = nosto)"
            value={form.amount}
            onChange={(v) => setField("amount", v)}
            step="100"
            unit="€"
          />
        )}
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* Result */}
      {scenarioResult ? (
        <ResultPanel result={scenarioResult} onAskAgent={onAskAgent} />
      ) : (
        <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.42)" }}>
          Täytä kenttä nähdäksesi arvion.
        </p>
      )}

      {/* FX status note + disclaimer */}
      <div className="flex flex-col gap-1 pt-1">
        <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.35)" }}>
          {fxSource === "live"
            ? "Valuuttamuunnos käyttää live FX -kursseja."
            : "Valuuttamuunnos käyttää static fallback -kursseja."}
        </p>
        <p className="text-[9px]" style={{ color: "rgba(148,163,184,0.35)" }}>
          Skenaario on arvio eikä muuta oikeaa salkkudataa.
        </p>
      </div>
    </div>
  );
}
