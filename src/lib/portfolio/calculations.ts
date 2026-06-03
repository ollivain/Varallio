import { convertToBaseCurrency } from "@/lib/currency/conversion";
import type { FXRateMap } from "@/lib/currency";
import type {
  AllocationItem,
  AssetType,
  Holding,
  Portfolio,
  PortfolioSummary,
} from "./types";

/** Finnish display labels for each asset type (used by the allocation chart). */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock: "Osakkeet",
  etf: "ETF:t",
  cash: "Käteinen",
  crypto: "Krypto",
  bond: "Korot",
  commodity: "Raaka-aineet",
  other: "Muut",
};

/** Stable display order for asset types in charts and legends. */
const ASSET_TYPE_ORDER: AssetType[] = [
  "stock",
  "etf",
  "cash",
  "crypto",
  "bond",
  "commodity",
  "other",
];

/**
 * Market value of a holding in the portfolio base currency (EUR).
 * Native price × quantity is converted using the holding's own currency.
 */
export function calculateHoldingValue(holding: Holding, rates?: FXRateMap): number {
  return convertToBaseCurrency(holding.quantity * holding.currentPrice, holding.currency, rates);
}

/**
 * Acquisition cost of a holding in the base currency (EUR).
 * Native average buy price × quantity, converted via the holding's currency.
 */
export function calculateHoldingCost(holding: Holding, rates?: FXRateMap): number {
  return convertToBaseCurrency(holding.quantity * holding.averageBuyPrice, holding.currency, rates);
}

/**
 * Today's absolute change in value for a holding, in base currency (EUR).
 * Falls back to 0 when the previous close is unknown.
 */
export function calculateHoldingDayChange(holding: Holding, rates?: FXRateMap): number {
  const previousClose = holding.previousClosePrice ?? holding.currentPrice;
  return convertToBaseCurrency(
    holding.quantity * (holding.currentPrice - previousClose),
    holding.currency,
    rates
  );
}

/**
 * Today's percentage change for a holding.
 * Returns 0 when the previous close is missing or zero (avoids divide-by-zero).
 */
export function calculateHoldingDayChangePercent(holding: Holding): number {
  const previousClose = holding.previousClosePrice;
  if (!previousClose) return 0;
  return ((holding.currentPrice - previousClose) / previousClose) * 100;
}

/** Total cash across every cash position, converted to base currency (EUR). */
function sumCash(portfolio: Portfolio, rates?: FXRateMap): number {
  return portfolio.cash.reduce(
    (total, position) => total + convertToBaseCurrency(position.amount, position.currency, rates),
    0
  );
}

/**
 * Aggregate the whole portfolio into the headline summary figures.
 *
 * Cash is valued at face value and counted in both total value and total cost,
 * so it never shows up as profit or loss.
 */
export function calculatePortfolioSummary(portfolio: Portfolio, rates?: FXRateMap): PortfolioSummary {
  const cashValue = sumCash(portfolio, rates);

  const holdingsValue = portfolio.holdings.reduce(
    (total, holding) => total + calculateHoldingValue(holding, rates),
    0
  );
  const holdingsCost = portfolio.holdings.reduce(
    (total, holding) => total + calculateHoldingCost(holding, rates),
    0
  );
  const dayChangeValue = portfolio.holdings.reduce(
    (total, holding) => total + calculateHoldingDayChange(holding, rates),
    0
  );

  const totalValue = holdingsValue + cashValue;
  const totalCost = holdingsCost + cashValue;
  const totalReturnValue = totalValue - totalCost;

  const previousTotalValue = totalValue - dayChangeValue;
  const dayChangePercent =
    previousTotalValue !== 0 ? (dayChangeValue / previousTotalValue) * 100 : 0;
  const totalReturnPercent =
    totalCost !== 0 ? (totalReturnValue / totalCost) * 100 : 0;

  return {
    totalValue,
    dayChangeValue,
    dayChangePercent,
    totalCost,
    totalReturnValue,
    totalReturnPercent,
  };
}

/**
 * Break the portfolio down by asset type (cash included), as percentages of
 * total value. Slices are returned in a stable display order, largest first
 * within ties, and empty asset types are omitted.
 */
export function calculateAllocationByAssetType(portfolio: Portfolio, rates?: FXRateMap): AllocationItem[] {
  const valueByType = new Map<AssetType, number>();

  for (const holding of portfolio.holdings) {
    const current = valueByType.get(holding.assetType) ?? 0;
    valueByType.set(holding.assetType, current + calculateHoldingValue(holding, rates));
  }

  const cashValue = sumCash(portfolio, rates);
  if (cashValue > 0) {
    valueByType.set("cash", (valueByType.get("cash") ?? 0) + cashValue);
  }

  const totalValue = Array.from(valueByType.values()).reduce((a, b) => a + b, 0);

  return Array.from(valueByType.entries())
    .map(([type, value]) => ({
      type,
      label: ASSET_TYPE_LABELS[type],
      value,
      percent: totalValue !== 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => {
      // Primary: stable asset-type order. Secondary: larger value first.
      const orderDelta =
        ASSET_TYPE_ORDER.indexOf(a.type) - ASSET_TYPE_ORDER.indexOf(b.type);
      return orderDelta !== 0 ? orderDelta : b.value - a.value;
    });
}
