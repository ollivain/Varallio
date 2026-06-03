import type { AllocationDrift } from "@/lib/goals";

export type ScenarioType =
  | "market_move"
  | "holding_move"
  | "add_contribution"
  | "cash_change";

export interface ScenarioInput {
  type: ScenarioType;
  /** Human-readable description of this scenario */
  label: string;
  /** For holding_move */
  symbol?: string;
  /** For add_contribution — assetType key to allocate to */
  categoryKey?: string;
  /** For market_move, holding_move — positive or negative percentage */
  percentChange?: number;
  /** For add_contribution, cash_change */
  amount?: number;
}

export interface ScenarioResult {
  input: ScenarioInput;
  basePortfolioValue: number;
  projectedPortfolioValue: number;
  valueChange: number;
  valueChangePercent: number;
  /** Projected cash after scenario (undefined when not applicable) */
  projectedCash?: number;
  affectedSymbols: string[];
  affectedCategories: string[];
  /** Drift after scenario — only present when goalSettings supplied */
  projectedAllocationDrift?: AllocationDrift[];
  /** Top 3 largest drift changes (before vs after) for quick display */
  topDriftChanges: DriftChange[];
  summary: string;
  warnings: string[];
}

export interface DriftChange {
  key: string;
  label: string;
  driftBefore: number;
  driftAfter: number;
  /** driftAfter - driftBefore (positive = more overweight) */
  changePP: number;
}
