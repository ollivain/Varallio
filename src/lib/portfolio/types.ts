/**
 * Portfolio domain model.
 *
 * This is the single source of truth for portfolio-shaped data in the app.
 * It is intentionally frontend-only and free of any persistence, API or auth
 * concerns — those can be layered on later without changing these types.
 */

export type AssetType =
  | "stock"
  | "etf"
  | "cash"
  | "crypto"
  | "bond"
  | "commodity"
  | "other";

export type Currency = "EUR" | "USD" | "SEK" | "NOK" | "GBP";

/** A single position the user owns (excluding pure cash, see {@link CashPosition}). */
export interface Holding {
  id: string;
  name: string;
  ticker: string;
  assetType: AssetType;
  currency: Currency;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  /** Yesterday's close. Optional — day change falls back to 0 when missing. */
  previousClosePrice?: number;
  sector?: string;
  region?: string;
  exchange?: string;
}

/** Uninvested cash held in a given currency. */
export interface CashPosition {
  id: string;
  currency: Currency;
  amount: number;
}

export interface Portfolio {
  id: string;
  name: string;
  baseCurrency: Currency;
  holdings: Holding[];
  cash: CashPosition[];
  /** ISO 8601 timestamp of the last data refresh. */
  updatedAt: string;
}

/** Aggregated, derived figures for the whole portfolio. */
export interface PortfolioSummary {
  totalValue: number;
  dayChangeValue: number;
  dayChangePercent: number;
  totalCost: number;
  totalReturnValue: number;
  totalReturnPercent: number;
}

/** One slice of the asset-type allocation breakdown. */
export interface AllocationItem {
  label: string;
  value: number;
  percent: number;
  type: AssetType;
}
