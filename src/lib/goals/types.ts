import type { AssetType } from "@/lib/portfolio/types";

export type AllocationTargetCategory = "assetType" | "cash" | "custom";

export interface AllocationTarget {
  id: string;
  label: string;
  category: AllocationTargetCategory;
  /** AssetType key or "cash" */
  key: string;
  targetPercent: number;
}

export interface PortfolioGoalSettings {
  monthlyContributionTarget?: number;
  allocationTargets: AllocationTarget[];
  updatedAt?: string;
}

export interface AllocationDrift {
  key: string;
  label: string;
  currentPercent: number;
  targetPercent: number;
  /** currentPercent - targetPercent (positive = overweight) */
  driftPercent: number;
  currentValue: number;
  targetValue: number;
  /** currentValue - targetValue (positive = overweight) */
  differenceValue: number;
  status: "underweight" | "overweight" | "on_target";
}

/** Keys that map directly to AssetType for filtering / matching. */
export const ASSET_TYPE_KEYS: AssetType[] = [
  "stock",
  "etf",
  "cash",
  "crypto",
  "bond",
  "commodity",
  "other",
];

/** Threshold (pp) above which a category is considered significantly off-target. */
export const DRIFT_WARN_THRESHOLD_PP = 10;

/** Threshold (pp) within which a category is considered "on target". */
export const DRIFT_ON_TARGET_THRESHOLD_PP = 3;
