import { convertToBaseCurrency } from "@/lib/currency/conversion";
import type { FXRateMap } from "@/lib/currency";
import type { Holding } from "@/lib/portfolio/types";
import type { Transaction } from "./types";

export interface SymbolCostBasis {
  symbol: string;
  averageCost: number;
  quantity: number;
}

export interface UnrealizedPosition {
  symbol: string;
  name?: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

export interface PortfolioPerformance {
  hasTransactions: boolean;
  transactionCount: number;
  firstTransactionDate?: string;
  lastTransactionDate?: string;
  totalDeposits: number;
  totalWithdrawals: number;
  netContributions: number;
  realizedDividends: number;
  totalFees: number;
  currentPortfolioValue: number;
  /** currentPortfolioValue + totalWithdrawals - totalDeposits */
  simpleGainLoss: number;
  /** null when there are no deposits to divide by */
  simpleReturnPercent: number | null;
  averageCostBySymbol: Record<string, SymbolCostBasis>;
  unrealizedPositions: UnrealizedPosition[];
  topUnrealizedGains: UnrealizedPosition[];
  topUnrealizedLosses: UnrealizedPosition[];
}

export function buildPortfolioPerformance(
  transactions: Transaction[],
  holdings: Holding[],
  currentPortfolioValue: number,
  rates?: FXRateMap
): PortfolioPerformance {
  const hasTransactions = transactions.length > 0;
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let realizedDividends = 0;
  let totalFees = 0;

  // Running weighted-average cost per symbol
  const positionMap = new Map<string, { averageCost: number; quantity: number }>();

  for (const tx of sorted) {
    // All monetary transaction amounts are converted to base currency (EUR).
    const amountBase = convertToBaseCurrency(tx.amount, tx.currency, rates);
    switch (tx.type) {
      case "deposit":
        totalDeposits += amountBase;
        break;
      case "withdrawal":
        totalWithdrawals += amountBase;
        break;
      case "dividend":
        realizedDividends += amountBase;
        break;
      case "fee":
        totalFees += amountBase;
        break;
      case "buy": {
        const sym = tx.symbol?.trim().toUpperCase();
        if (!sym || !tx.quantity || !tx.price) break;
        // Average cost is tracked per share in base currency (EUR).
        const priceBase = convertToBaseCurrency(tx.price, tx.currency, rates);
        const cur = positionMap.get(sym) ?? { averageCost: 0, quantity: 0 };
        const newQty = cur.quantity + tx.quantity;
        const newAvg =
          newQty > 0
            ? (cur.averageCost * cur.quantity + priceBase * tx.quantity) / newQty
            : priceBase;
        positionMap.set(sym, { averageCost: newAvg, quantity: newQty });
        break;
      }
      case "sell": {
        const sym = tx.symbol?.trim().toUpperCase();
        if (!sym || !tx.quantity) break;
        const cur = positionMap.get(sym);
        if (!cur) break;
        const newQty = Math.max(0, cur.quantity - tx.quantity);
        positionMap.set(sym, { ...cur, quantity: newQty });
        break;
      }
    }
  }

  const netContributions = totalDeposits - totalWithdrawals;
  const simpleGainLoss = currentPortfolioValue + totalWithdrawals - totalDeposits;
  const simpleReturnPercent =
    totalDeposits > 0 ? (simpleGainLoss / totalDeposits) * 100 : null;

  // Build unrealized positions by matching cost-basis records to live holdings
  const holdingMap = new Map<string, Holding>(
    holdings.map((h) => [h.ticker.trim().toUpperCase(), h])
  );

  const unrealizedPositions: UnrealizedPosition[] = [];
  for (const [symbol, pos] of positionMap.entries()) {
    if (pos.quantity <= 0) continue;
    const holding = holdingMap.get(symbol);
    if (!holding) continue;
    // Both cost basis (avg cost is already EUR) and market value are in EUR.
    const costBasis = pos.averageCost * pos.quantity;
    const marketValue = convertToBaseCurrency(
      holding.currentPrice * pos.quantity,
      holding.currency,
      rates
    );
    const unrealizedGain = marketValue - costBasis;
    const unrealizedGainPercent =
      costBasis !== 0 ? (unrealizedGain / costBasis) * 100 : 0;
    unrealizedPositions.push({
      symbol,
      name: holding.name,
      quantity: pos.quantity,
      // averageCost and currentPrice are both expressed per share in base currency (EUR).
      averageCost: pos.averageCost,
      currentPrice: convertToBaseCurrency(holding.currentPrice, holding.currency, rates),
      costBasis,
      marketValue,
      unrealizedGain,
      unrealizedGainPercent,
    });
  }

  const topUnrealizedGains = [...unrealizedPositions]
    .filter((p) => p.unrealizedGain > 0)
    .sort((a, b) => b.unrealizedGainPercent - a.unrealizedGainPercent)
    .slice(0, 3);

  const topUnrealizedLosses = [...unrealizedPositions]
    .filter((p) => p.unrealizedGain < 0)
    .sort((a, b) => a.unrealizedGainPercent - b.unrealizedGainPercent)
    .slice(0, 3);

  const averageCostBySymbol: Record<string, SymbolCostBasis> = {};
  for (const [symbol, pos] of positionMap.entries()) {
    averageCostBySymbol[symbol] = { symbol, ...pos };
  }

  const dates = sorted.map((tx) => tx.date).filter(Boolean);

  return {
    hasTransactions,
    transactionCount: transactions.length,
    firstTransactionDate: dates[0],
    lastTransactionDate: dates.at(-1),
    totalDeposits,
    totalWithdrawals,
    netContributions,
    realizedDividends,
    totalFees,
    currentPortfolioValue,
    simpleGainLoss,
    simpleReturnPercent,
    averageCostBySymbol,
    unrealizedPositions,
    topUnrealizedGains,
    topUnrealizedLosses,
  };
}
