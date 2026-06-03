import { convertToBaseCurrency } from "@/lib/currency/conversion";
import type { FXRateMap } from "@/lib/currency";
import type { Transaction } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * One month in the portfolio cash-flow history.
 * Cumulative fields carry forward from the beginning of the series.
 */
export interface PortfolioHistoryPoint {
  /** "YYYY-MM" */
  month: string;
  /** "YYYY-MM-01" — first day of the month */
  date: string;
  /** Transactions that occurred this specific month */
  deposits: number;
  withdrawals: number;
  netContributions: number;
  dividends: number;
  fees: number;
  /** Running totals from the very first transaction */
  cumulativeDeposits: number;
  cumulativeWithdrawals: number;
  cumulativeNetContributions: number;
  cumulativeDividends: number;
  cumulativeFees: number;
}

export interface PortfolioHistorySummary {
  /** Monthly data points from first to last transaction month (inclusive). */
  points: PortfolioHistoryPoint[];
  firstDate?: string;
  lastDate?: string;
  /** Number of months between first and last transaction (inclusive). */
  periodMonths: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netContributions: number;
  totalDividends: number;
  totalFees: number;
  currentValue: number;
  /** currentValue + withdrawals - deposits  (simple cash-on-cash measure) */
  estimatedGainLoss: number;
  /** estimatedGainLoss / deposits * 100 — null when deposits = 0 */
  estimatedReturnPercent: number | null;
  hasHistory: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMonth(date: string): string {
  // Expects "YYYY-MM-DD", returns "YYYY-MM"
  return date.slice(0, 7);
}

function monthToDate(month: string): string {
  return `${month}-01`;
}

/**
 * Returns an ordered array of "YYYY-MM" strings covering every month
 * from `startMonth` through `endMonth` inclusive.
 */
function monthRange(startMonth: string, endMonth: string): string[] {
  const result: string[] = [];
  let [y, m] = startMonth.split("-").map(Number);
  const [ey, em] = endMonth.split("-").map(Number);

  while (y < ey || (y === ey && m <= em)) {
    result.push(`${String(y)}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Builds a monthly cash-flow history from the transaction log.
 *
 * Important: this is a *cash-flow* history, not a *market-value* history.
 * We do not have historical prices, so intermediate portfolio values cannot
 * be calculated accurately. The only "value" reference is `currentValue`
 * (live portfolio value) which is pinned to the final data point.
 *
 * Charts and UI should make this distinction clear to avoid misleading users.
 */
export function buildPortfolioHistory(
  transactions: Transaction[],
  currentValue: number,
  rates?: FXRateMap
): PortfolioHistorySummary {
  if (transactions.length === 0) {
    return {
      points: [],
      periodMonths: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      netContributions: 0,
      totalDividends: 0,
      totalFees: 0,
      currentValue,
      estimatedGainLoss: 0,
      estimatedReturnPercent: null,
      hasHistory: false,
    };
  }

  // 1. Bucket each transaction into its month
  type MonthBucket = {
    deposits: number;
    withdrawals: number;
    dividends: number;
    fees: number;
  };

  const byMonth = new Map<string, MonthBucket>();

  for (const tx of transactions) {
    if (!tx.date) continue;
    const month = toMonth(tx.date);
    const bucket = byMonth.get(month) ?? {
      deposits: 0,
      withdrawals: 0,
      dividends: 0,
      fees: 0,
    };

    // All cash-flow amounts are converted to base currency (EUR).
    const amountBase = convertToBaseCurrency(tx.amount, tx.currency, rates);
    switch (tx.type) {
      case "deposit":
        bucket.deposits += amountBase;
        break;
      case "withdrawal":
        bucket.withdrawals += amountBase;
        break;
      case "dividend":
        bucket.dividends += amountBase;
        break;
      case "fee":
        bucket.fees += amountBase;
        break;
      // buy/sell do not affect cash-flow totals here
    }

    byMonth.set(month, bucket);
  }

  // 2. Determine the full month range
  const allMonths = [...byMonth.keys()].sort();
  const startMonth = allMonths[0];
  const endMonth = allMonths.at(-1)!;
  const months = monthRange(startMonth, endMonth);

  // 3. Build cumulative series
  let cumDeposits = 0;
  let cumWithdrawals = 0;
  let cumDividends = 0;
  let cumFees = 0;

  const points: PortfolioHistoryPoint[] = months.map((month) => {
    const b = byMonth.get(month) ?? {
      deposits: 0,
      withdrawals: 0,
      dividends: 0,
      fees: 0,
    };

    cumDeposits += b.deposits;
    cumWithdrawals += b.withdrawals;
    cumDividends += b.dividends;
    cumFees += b.fees;

    const netContributions = b.deposits - b.withdrawals;
    const cumulativeNetContributions = cumDeposits - cumWithdrawals;

    return {
      month,
      date: monthToDate(month),
      deposits: b.deposits,
      withdrawals: b.withdrawals,
      netContributions,
      dividends: b.dividends,
      fees: b.fees,
      cumulativeDeposits: cumDeposits,
      cumulativeWithdrawals: cumWithdrawals,
      cumulativeNetContributions,
      cumulativeDividends: cumDividends,
      cumulativeFees: cumFees,
    };
  });

  const totalDeposits = cumDeposits;
  const totalWithdrawals = cumWithdrawals;
  const totalDividends = cumDividends;
  const totalFees = cumFees;
  const netContributions = totalDeposits - totalWithdrawals;
  const estimatedGainLoss = currentValue + totalWithdrawals - totalDeposits;
  const estimatedReturnPercent =
    totalDeposits > 0 ? (estimatedGainLoss / totalDeposits) * 100 : null;

  return {
    points,
    firstDate: points[0]?.date,
    lastDate: points.at(-1)?.date,
    periodMonths: months.length,
    totalDeposits,
    totalWithdrawals,
    netContributions,
    totalDividends,
    totalFees,
    currentValue,
    estimatedGainLoss,
    estimatedReturnPercent,
    hasHistory: true,
  };
}
