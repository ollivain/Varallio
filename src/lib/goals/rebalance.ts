import type { AllocationDrift, PortfolioGoalSettings } from "./types";

// ── Public types ──────────────────────────────────────────────────────────────

export interface ContributionPlanItem {
  key: string;
  label: string;
  currentPercent: number;
  targetPercent: number;
  /** currentPercent - targetPercent before the contribution */
  driftPercent: number;
  /** Suggested allocation of the contribution to this category (≥ 0) */
  suggestedAmount: number;
  projectedPercent: number;
  statusAfter: "underweight" | "overweight" | "on_target";
  reason: string;
}

export interface ContributionPlan {
  contributionAmount: number;
  items: ContributionPlanItem[];
  totalAllocated: number;
  unallocatedAmount: number;
  /** Item that receives the largest suggested allocation */
  primaryFocus?: ContributionPlanItem;
  summary: string;
  hasTargets: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ON_TARGET_THRESHOLD_PP = 3;

function statusFromDrift(
  projectedPercent: number,
  targetPercent: number
): ContributionPlanItem["statusAfter"] {
  const drift = projectedPercent - targetPercent;
  if (Math.abs(drift) <= ON_TARGET_THRESHOLD_PP) return "on_target";
  return drift > 0 ? "overweight" : "underweight";
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Calculates a contribution plan that shows how a new cash injection
 * could be distributed to bring the portfolio closer to the target
 * allocation in goalSettings.
 *
 * This is a PLANNING TOOL, not a buy/sell recommendation.
 * The output should be presented as "if you want to approach your target
 * allocation" — never as a direct instruction to purchase anything.
 */
export function buildContributionPlan(
  goalSettings: PortfolioGoalSettings,
  allocationDrift: AllocationDrift[],
  totalPortfolioValue: number,
  contributionAmount: number
): ContributionPlan {
  const hasTargets =
    goalSettings.allocationTargets.length > 0 && allocationDrift.length > 0;

  if (!hasTargets || contributionAmount <= 0) {
    return {
      contributionAmount,
      items: allocationDrift.map((d) => ({
        key: d.key,
        label: d.label,
        currentPercent: d.currentPercent,
        targetPercent: d.targetPercent,
        driftPercent: d.driftPercent,
        suggestedAmount: 0,
        projectedPercent: d.currentPercent,
        statusAfter: d.status,
        reason:
          d.status === "overweight"
            ? `${d.label} on jo ylipainossa — ei ehdotusta.`
            : d.status === "underweight"
              ? `${d.label} on alipainossa mutta talletus on nolla.`
              : `${d.label} on lähellä tavoitetta.`,
      })),
      totalAllocated: 0,
      unallocatedAmount: contributionAmount,
      hasTargets,
      summary: contributionAmount <= 0
        ? "Syötä talletus saadaksesi suunnitelman."
        : "Ei tavoitteita asetettu — aseta tavoitteet saadaksesi suunnitelman.",
    };
  }

  const newTotal = totalPortfolioValue + contributionAmount;

  // 1. Compute "needed to reach target" for each underweight category
  const underweightItems = allocationDrift
    .filter((d) => d.status === "underweight")
    .sort((a, b) => a.driftPercent - b.driftPercent); // most underweight first

  const neededAmounts = new Map<string, number>();
  for (const item of underweightItems) {
    const targetValue = (item.targetPercent / 100) * newTotal;
    const needed = Math.max(0, targetValue - item.currentValue);
    neededAmounts.set(item.key, needed);
  }

  const totalNeeded = Array.from(neededAmounts.values()).reduce((s, v) => s + v, 0);

  // 2. Distribute contribution
  const suggestedAmounts = new Map<string, number>();

  if (totalNeeded <= 0) {
    // All categories already at or above target even in new total
    // Distribute proportionally to target percents
    const totalTargetPct = allocationDrift.reduce((s, d) => s + d.targetPercent, 0);
    for (const d of allocationDrift) {
      const share =
        totalTargetPct > 0
          ? (d.targetPercent / totalTargetPct) * contributionAmount
          : 0;
      suggestedAmounts.set(d.key, share);
    }
  } else if (totalNeeded <= contributionAmount) {
    // Can fully bring all underweight to target
    for (const item of underweightItems) {
      suggestedAmounts.set(item.key, neededAmounts.get(item.key) ?? 0);
    }
    // Remaining is unallocated (shown separately)
  } else {
    // Not enough to fix all — distribute proportionally among underweight
    for (const item of underweightItems) {
      const share = ((neededAmounts.get(item.key) ?? 0) / totalNeeded) * contributionAmount;
      suggestedAmounts.set(item.key, share);
    }
  }

  // 3. Build items for all categories
  const totalAllocated = Array.from(suggestedAmounts.values()).reduce(
    (s, v) => s + v,
    0
  );
  const unallocatedAmount = Math.max(0, contributionAmount - totalAllocated);

  const items: ContributionPlanItem[] = allocationDrift.map((d) => {
    const suggested = suggestedAmounts.get(d.key) ?? 0;
    const projectedValue = d.currentValue + suggested;
    const projectedPercent = newTotal > 0 ? (projectedValue / newTotal) * 100 : 0;
    const status = statusFromDrift(projectedPercent, d.targetPercent);

    let reason: string;
    if (suggested > 0) {
      reason = `Alipaino ${Math.abs(d.driftPercent).toFixed(1)} pp — ${suggested.toFixed(0)} € voi viedä lähemmäs ${d.targetPercent} % tavoitetta.`;
    } else if (d.status === "overweight") {
      reason = `${d.label} on jo ylipainossa — ei lisäystä tähän.`;
    } else {
      reason = `${d.label} on lähellä tavoitetta.`;
    }

    return {
      key: d.key,
      label: d.label,
      currentPercent: d.currentPercent,
      targetPercent: d.targetPercent,
      driftPercent: d.driftPercent,
      suggestedAmount: suggested,
      projectedPercent,
      statusAfter: status,
      reason,
    };
  });

  // 4. Primary focus: largest suggested allocation
  const primaryFocus = [...items]
    .filter((i) => i.suggestedAmount > 0)
    .sort((a, b) => b.suggestedAmount - a.suggestedAmount)[0];

  // 5. Summary
  let summary: string;
  if (underweightItems.length === 0) {
    summary = `Allokaatio on jo lähellä tai yli kaikkien tavoitteiden — ${contributionAmount.toFixed(0)} € voidaan jakaa tavoiteprosenttien suhteessa.`;
  } else if (primaryFocus) {
    summary = `Suurin alipainokohde on ${primaryFocus.label} (${Math.abs(primaryFocus.driftPercent).toFixed(1)} pp). ${primaryFocus.suggestedAmount.toFixed(0)} € sijoitus voi lähentää tavoitetta — vertaa tilannettasi ennen päätöksiä.`;
  } else {
    summary = `Talletus ${contributionAmount.toFixed(0)} € suunniteltu tavoiteallokaation mukaan.`;
  }

  return {
    contributionAmount,
    items,
    totalAllocated,
    unallocatedAmount,
    primaryFocus,
    summary,
    hasTargets,
  };
}
