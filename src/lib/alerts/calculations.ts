import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";
import { formatCurrency } from "@/lib/formatters";
import type { AlertRow, PriceAlert } from "./types";

interface InstrumentPrice {
  currentPrice: number;
  name: string;
}

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function findInstrumentPrice(
  ticker: string,
  portfolio: Portfolio,
  watchlist: Watchlist
): InstrumentPrice | undefined {
  const normalizedTicker = normalizeTicker(ticker);

  const watchlistItem = watchlist.items.find(
    (item) => normalizeTicker(item.ticker) === normalizedTicker
  );
  if (watchlistItem) {
    return {
      currentPrice: watchlistItem.currentPrice,
      name: watchlistItem.name,
    };
  }

  const holding = portfolio.holdings.find(
    (item) => normalizeTicker(item.ticker) === normalizedTicker
  );
  if (holding) {
    return {
      currentPrice: holding.currentPrice,
      name: holding.name,
    };
  }

  return undefined;
}

export function evaluatePriceAlert(
  alert: PriceAlert,
  portfolio: Portfolio,
  watchlist: Watchlist
): AlertRow {
  const instrumentPrice = findInstrumentPrice(alert.ticker, portfolio, watchlist);
  const currentPrice = instrumentPrice?.currentPrice;
  const isTriggered =
    currentPrice !== undefined &&
    (alert.direction === "above"
      ? currentPrice >= alert.targetPrice
      : currentPrice <= alert.targetPrice);
  const directionLabel = alert.direction === "above" ? "yli" : "alle";

  return {
    id: alert.id,
    label: `${alert.name}: hinta ${directionLabel} ${formatCurrency(alert.targetPrice, {
      currency: alert.currency,
      decimals: 0,
    })}`,
    ticker: alert.ticker,
    targetPrice: alert.targetPrice,
    currentPrice,
    direction: alert.direction,
    status: isTriggered ? "triggered" : alert.status === "triggered" ? "triggered" : "active",
    timeLabel:
      currentPrice === undefined
        ? "Hintaa ei löydy"
        : `Nyt ${formatCurrency(currentPrice, {
            currency: alert.currency,
            decimals: 2,
          })}`,
    note: alert.note,
  };
}

export function calculateAlertRows(
  alerts: PriceAlert[],
  portfolio: Portfolio,
  watchlist: Watchlist
): AlertRow[] {
  return alerts.map((alert) => evaluatePriceAlert(alert, portfolio, watchlist));
}

export function sortAlertRows(rows: AlertRow[]): AlertRow[] {
  return [...rows].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "triggered" ? -1 : 1;
    }

    return a.label.localeCompare(b.label, "fi");
  });
}
