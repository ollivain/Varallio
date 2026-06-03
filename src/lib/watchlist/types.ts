import type { Currency } from "@/lib/portfolio/types";

/**
 * Watchlist domain model.
 *
 * This is intentionally independent from the portfolio model: a watchlist
 * tracks instruments the user is *interested in*, whether or not they own them.
 * It reuses the shared {@link Currency} type from the portfolio model to avoid
 * a second, divergent currency definition.
 */

export type WatchlistAssetType =
  | "stock"
  | "etf"
  | "crypto"
  | "commodity"
  | "currency"
  | "index"
  | "other";

/** A single instrument the user is following (not necessarily owned). */
export interface WatchlistItem {
  id: string;
  name: string;
  ticker: string;
  assetType: WatchlistAssetType;
  currency: Currency;
  currentPrice: number;
  /** Yesterday's close. Optional — change falls back to 0 when missing. */
  previousClosePrice?: number;
  exchange?: string;
  sector?: string;
  region?: string;
  notes?: string;
  tags?: string[];
  /** ISO 8601 timestamp of when the item was added to the watchlist. */
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
  /** ISO 8601 timestamp of the last data refresh. */
  updatedAt: string;
}

/**
 * A presentational row derived from a {@link WatchlistItem}.
 *
 * This type lives here (not in the portfolio model) because the watchlist now
 * owns the "things the user follows" concern. The dashboard's Seurantalista
 * consumes these rows.
 */
export interface WatchlistRow {
  id: string;
  name: string;
  ticker: string;
  price: number;
  changeValue: number;
  changePercent: number;
  currency: Currency;
}
