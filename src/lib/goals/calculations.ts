import type { AllocationItem } from "@/lib/portfolio/types";
import {
  DRIFT_ON_TARGET_THRESHOLD_PP,
  type AllocationDrift,
  type PortfolioGoalSettings,
} from "./types";

/**
 * Compare each allocation target in goalSettings against the current
 * portfolio allocation and return per-category drift figures.
 *
 * Categories with no current allocation get currentPercent = 0.
 * Only targets defined in goalSettings.allocationTargets are returned.
 */
export function buildAllocationDrift(
  goalSettings: PortfolioGoalSettings,
  allocation: AllocationItem[],
  totalValue: number
): AllocationDrift[] {
  // Build a lookup from assetType key → current AllocationItem
  const byKey = new Map<string, AllocationItem>(
    allocation.map((item) => [item.type, item])
  );

  return goalSettings.allocationTargets.map((target) => {
    const current = byKey.get(target.key);
    const currentPercent = current?.percent ?? 0;
    const currentValue = current?.value ?? 0;
    const targetPercent = target.targetPercent;
    const targetValue = totalValue * (targetPercent / 100);
    const driftPercent = currentPercent - targetPercent;
    const differenceValue = currentValue - targetValue;

    let status: AllocationDrift["status"];
    const absDrift = Math.abs(driftPercent);
    if (absDrift <= DRIFT_ON_TARGET_THRESHOLD_PP) {
      status = "on_target";
    } else if (driftPercent > 0) {
      status = "overweight";
    } else {
      status = "underweight";
    }

    return {
      key: target.key,
      label: target.label,
      currentPercent,
      targetPercent,
      driftPercent,
      currentValue,
      targetValue,
      differenceValue,
      status,
    };
  });
}

/** Total of all target percentages — used to warn when != 100 %. */
export function sumTargetPercents(goalSettings: PortfolioGoalSettings): number {
  return goalSettings.allocationTargets.reduce(
    (sum, t) => sum + t.targetPercent,
    0
  );
}
