import type { Currency } from "@/lib/portfolio";

export type AlertDirection = "above" | "below";

export type AlertStatus = "active" | "triggered";

export interface PriceAlert {
  id: string;
  ticker: string;
  name: string;
  targetPrice: number;
  direction: AlertDirection;
  currency: Currency;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  triggeredAt?: string;
  note?: string;
}

export interface AlertRow {
  id: string;
  label: string;
  ticker: string;
  targetPrice: number;
  currentPrice?: number;
  direction: AlertDirection;
  status: AlertStatus;
  timeLabel: string;
  note?: string;
}
