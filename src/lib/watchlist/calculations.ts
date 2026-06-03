import type { Watchlist, WatchlistItem, WatchlistRow } from "./types";

/**
 * Today's absolute and percentage change for a watchlist item.
 * Returns zeros when the previous close is missing or zero (avoids
 * divide-by-zero and keeps the UI safe).
 */
export function calculateWatchlistItemChange(item: WatchlistItem): {
  changeValue: number;
  changePercent: number;
} {
  const previousClose = item.previousClosePrice;
  if (!previousClose) {
    return { changeValue: 0, changePercent: 0 };
  }
  const changeValue = item.currentPrice - previousClose;
  const changePercent = (changeValue / previousClose) * 100;
  return { changeValue, changePercent };
}

/** Map every watchlist item into a presentational row for the Seurantalista. */
export function calculateWatchlistRows(watchlist: Watchlist): WatchlistRow[] {
  return watchlist.items.map((item) => {
    const { changeValue, changePercent } = calculateWatchlistItemChange(item);
    return {
      id: item.id,
      name: item.name,
      ticker: item.ticker,
      price: item.currentPrice,
      changeValue,
      changePercent,
      currency: item.currency,
    };
  });
}

export type WatchlistSortBy = "changePercent" | "changeValue" | "price" | "name";

/**
 * Return a sorted copy of the rows. Unsorted (default) preserves the
 * watchlist's own order. Numeric sorts are descending (biggest first);
 * name sorts ascending using Finnish collation.
 */
export function sortWatchlistRows(
  rows: WatchlistRow[],
  sortBy?: WatchlistSortBy
): WatchlistRow[] {
  const copy = [...rows];
  switch (sortBy) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "fi"));
    case "price":
      return copy.sort((a, b) => b.price - a.price);
    case "changeValue":
      return copy.sort((a, b) => b.changeValue - a.changeValue);
    case "changePercent":
      return copy.sort((a, b) => b.changePercent - a.changePercent);
    default:
      return copy;
  }
}
