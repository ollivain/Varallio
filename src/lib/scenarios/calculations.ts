import { buildAllocationDrift, type PortfolioGoalSettings } from "@/lib/goals";
import type { AllocationDrift } from "@/lib/goals";
import type { AllocationItem, AssetType, Portfolio } from "@/lib/portfolio/types";
import { ASSET_TYPE_LABELS } from "@/lib/portfolio/calculations";
import { convertToBaseCurrency } from "@/lib/currency/conversion";
import type { FXRateMap } from "@/lib/currency";
import type {
  DriftChange,
  ScenarioInput,
  ScenarioResult,
} from "./types";

// ── Projected allocation ─────────────────────────────────────────────────────

/**
 * Produces a modified AllocationItem[] reflecting the scenario without
 * changing any real state. Percents are recomputed from the projected total.
 */
function computeProjectedAllocation(
  baseAllocation: AllocationItem[],
  portfolio: Portfolio,
  input: ScenarioInput,
  projectedTotal: number,
  rates?: FXRateMap
): AllocationItem[] {
  const rePercent = (items: AllocationItem[]): AllocationItem[] =>
    items.map((item) => ({
      ...item,
      percent: projectedTotal > 0 ? (item.value / projectedTotal) * 100 : 0,
    }));

  switch (input.type) {
    case "market_move": {
      const factor = 1 + (input.percentChange ?? 0) / 100;
      return rePercent(
        baseAllocation.map((item) =>
          item.type === "cash"
            ? item
            : { ...item, value: item.value * factor }
        )
      );
    }

    case "holding_move": {
      const symbol = input.symbol?.trim().toUpperCase();
      if (!symbol) return rePercent(baseAllocation);
      const holding = portfolio.holdings.find(
        (h) => h.ticker.trim().toUpperCase() === symbol
      );
      if (!holding) return rePercent(baseAllocation);

      // Work in base currency (EUR) so the delta is consistent with the
      // already-EUR baseAllocation values.
      const originalValue = convertToBaseCurrency(
        holding.quantity * holding.currentPrice,
        holding.currency,
        rates
      );
      const newValue = originalValue * (1 + (input.percentChange ?? 0) / 100);
      const delta = newValue - originalValue;
      const targetType = holding.assetType;

      return rePercent(
        baseAllocation.map((item) =>
          item.type === targetType
            ? { ...item, value: Math.max(0, item.value + delta) }
            : item
        )
      );
    }

    case "add_contribution": {
      const amount = Math.max(0, input.amount ?? 0);
      const targetKey = (input.categoryKey || "cash") as AssetType;
      const exists = baseAllocation.some((item) => item.type === targetKey);

      const updated = baseAllocation.map((item) =>
        item.type === targetKey
          ? { ...item, value: item.value + amount }
          : item
      );

      if (!exists && amount > 0) {
        updated.push({
          type: targetKey,
          label: ASSET_TYPE_LABELS[targetKey] ?? targetKey,
          value: amount,
          percent: 0,
        });
      }

      return rePercent(updated);
    }

    case "cash_change": {
      const amount = input.amount ?? 0;
      return rePercent(
        baseAllocation.map((item) =>
          item.type === "cash"
            ? { ...item, value: Math.max(0, item.value + amount) }
            : item
        )
      );
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

function buildSummary(
  input: ScenarioInput,
  valueChange: number,
  valueChangePercent: number,
  warnings: string[]
): string {
  const sign = valueChange >= 0 ? "+" : "";
  const changeStr = `${sign}${valueChange.toFixed(0)} € (${sign}${valueChangePercent.toFixed(1)} %)`;

  if (warnings.length > 0) {
    return `Skenaario sisältää varoituksia. Arvioitu muutos: ${changeStr}.`;
  }

  switch (input.type) {
    case "market_move":
      return `Jos kaikki osakkeet liikkuisivat ${input.percentChange ?? 0} %, salkun arvo muuttuisi arviolta ${changeStr}.`;
    case "holding_move":
      return `Jos ${input.symbol ?? "?"} arvo muuttuisi ${input.percentChange ?? 0} %, salkun arvo muuttuisi arviolta ${changeStr}.`;
    case "add_contribution":
      return `Jos talletukselle ${input.amount?.toFixed(0) ?? 0} € kohdennettaisiin ${input.categoryKey ?? "käteiseen"}, salkun arvo kasvaisi ${changeStr}.`;
    case "cash_change":
      return `Käteisen muutos (${(input.amount ?? 0) >= 0 ? "+" : ""}${input.amount?.toFixed(0) ?? 0} €) muuttaisi salkun arvoa arviolta ${changeStr}.`;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Compute a what-if scenario result without modifying any real state.
 *
 * The scenario is purely hypothetical — the result can be displayed to the
 * user as an estimate and passed to the agent for analysis, but it must
 * never be written back to the portfolio or localStorage.
 */
export function buildScenarioResult(
  input: ScenarioInput,
  portfolio: Portfolio,
  baseAllocation: AllocationItem[],
  baseDrift: AllocationDrift[],
  goalSettings?: PortfolioGoalSettings,
  rates?: FXRateMap
): ScenarioResult {
  // All base figures are in the portfolio base currency (EUR).
  const baseCash = portfolio.cash.reduce(
    (s, c) => s + convertToBaseCurrency(c.amount, c.currency, rates),
    0
  );
  const baseHoldingsValue = portfolio.holdings.reduce(
    (s, h) => s + convertToBaseCurrency(h.quantity * h.currentPrice, h.currency, rates),
    0
  );
  const basePortfolioValue = baseCash + baseHoldingsValue;

  const warnings: string[] = [];
  let projectedPortfolioValue = basePortfolioValue;
  let projectedCash: number | undefined;
  const affectedSymbols: string[] = [];
  const affectedCategories: string[] = [];

  switch (input.type) {
    case "market_move": {
      const factor = 1 + (input.percentChange ?? 0) / 100;
      const projectedHoldings = baseHoldingsValue * factor;
      projectedPortfolioValue = baseCash + projectedHoldings;
      for (const item of baseAllocation) {
        if (item.type !== "cash" && item.value > 0) {
          affectedCategories.push(item.label);
        }
      }
      for (const h of portfolio.holdings) {
        affectedSymbols.push(h.ticker);
      }
      break;
    }

    case "holding_move": {
      const symbol = input.symbol?.trim().toUpperCase() ?? "";
      if (!symbol) {
        warnings.push("Symboli puuttuu.");
        break;
      }
      const holding = portfolio.holdings.find(
        (h) => h.ticker.trim().toUpperCase() === symbol
      );
      if (!holding) {
        warnings.push(`Symbolia ${symbol} ei löydy portfoliosta.`);
        break;
      }
      // Convert to base currency (EUR) so the delta matches basePortfolioValue.
      const original = convertToBaseCurrency(
        holding.quantity * holding.currentPrice,
        holding.currency,
        rates
      );
      const updated = original * (1 + (input.percentChange ?? 0) / 100);
      projectedPortfolioValue = basePortfolioValue + (updated - original);
      affectedSymbols.push(symbol);
      affectedCategories.push(
        ASSET_TYPE_LABELS[holding.assetType] ?? holding.assetType
      );
      break;
    }

    case "add_contribution": {
      const amount = input.amount ?? 0;
      if (amount <= 0) {
        warnings.push("Talletuksen summa täytyy olla positiivinen.");
        break;
      }
      projectedPortfolioValue = basePortfolioValue + amount;
      if (input.categoryKey) {
        affectedCategories.push(input.categoryKey);
      } else {
        projectedCash = baseCash + amount;
        affectedCategories.push("cash");
      }
      break;
    }

    case "cash_change": {
      const amount = input.amount ?? 0;
      const newCash = baseCash + amount;
      if (newCash < 0) {
        warnings.push(
          `Käteinen menisi negatiiviseksi (${newCash.toFixed(0)} €). Käteinen rajoitettu nollaan.`
        );
        projectedCash = 0;
        projectedPortfolioValue = basePortfolioValue - baseCash;
      } else {
        projectedCash = newCash;
        projectedPortfolioValue = basePortfolioValue + amount;
      }
      affectedCategories.push("cash");
      break;
    }
  }

  const valueChange = projectedPortfolioValue - basePortfolioValue;
  const valueChangePercent =
    basePortfolioValue > 0 ? (valueChange / basePortfolioValue) * 100 : 0;

  // Projected allocation drift
  let projectedAllocationDrift: AllocationDrift[] | undefined;
  const topDriftChanges: DriftChange[] = [];

  if (goalSettings && goalSettings.allocationTargets.length > 0) {
    const projectedAllocation = computeProjectedAllocation(
      baseAllocation,
      portfolio,
      input,
      projectedPortfolioValue,
      rates
    );
    projectedAllocationDrift = buildAllocationDrift(
      goalSettings,
      projectedAllocation,
      projectedPortfolioValue
    );

    // Compute drift changes (before vs after)
    const baseDriftMap = new Map(baseDrift.map((d) => [d.key, d.driftPercent]));
    for (const after of projectedAllocationDrift) {
      const before = baseDriftMap.get(after.key) ?? 0;
      const changePP = after.driftPercent - before;
      if (Math.abs(changePP) >= 0.1) {
        topDriftChanges.push({
          key: after.key,
          label: after.label,
          driftBefore: before,
          driftAfter: after.driftPercent,
          changePP,
        });
      }
    }
    topDriftChanges.sort((a, b) => Math.abs(b.changePP) - Math.abs(a.changePP));
    topDriftChanges.splice(3); // keep top 3
  }

  return {
    input,
    basePortfolioValue,
    projectedPortfolioValue,
    valueChange,
    valueChangePercent,
    projectedCash,
    affectedSymbols,
    affectedCategories,
    projectedAllocationDrift,
    topDriftChanges,
    summary: buildSummary(input, valueChange, valueChangePercent, warnings),
    warnings,
  };
}
