import type { Currency } from "@/lib/portfolio/types";

export type TransactionType =
  | "buy"
  | "sell"
  | "deposit"
  | "withdrawal"
  | "dividend"
  | "fee";

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Required for buy / sell / dividend; optional for others. */
  symbol?: string;
  name?: string;
  /** Number of units — used for buy / sell. */
  quantity?: number;
  /** Per-unit price — used for buy / sell. */
  price?: number;
  /** Total amount. Always positive; sign is implied by type. */
  amount: number;
  currency: Currency;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  createdAt: string;
}
