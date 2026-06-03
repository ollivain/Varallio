import type { PriceAlert } from "./types";

export const mockAlerts: PriceAlert[] = [
  {
    id: "alert-nvda-1000",
    ticker: "NVDA",
    name: "NVIDIA",
    targetPrice: 1000,
    direction: "above",
    currency: "EUR",
    status: "active",
    createdAt: "2026-06-01T08:05:00.000Z",
    updatedAt: "2026-06-01T08:05:00.000Z",
    note: "Seuraa jos kurssi rikkoo 1000 euron tason.",
  },
  {
    id: "alert-asml-850",
    ticker: "ASML",
    name: "ASML",
    targetPrice: 850,
    direction: "above",
    currency: "EUR",
    status: "active",
    createdAt: "2026-06-01T08:06:00.000Z",
    updatedAt: "2026-06-01T08:06:00.000Z",
  },
  {
    id: "alert-fortum-16",
    ticker: "FORTUM",
    name: "Fortum",
    targetPrice: 16,
    direction: "below",
    currency: "EUR",
    status: "active",
    createdAt: "2026-06-01T08:07:00.000Z",
    updatedAt: "2026-06-01T08:07:00.000Z",
  },
];

export default mockAlerts;
