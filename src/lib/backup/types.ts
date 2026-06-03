import type { FXRatesResponse } from "@/lib/currency";
import type { PortfolioGoalSettings } from "@/lib/goals";
import type { NewsItem } from "@/lib/news";
import type { PriceAlert } from "@/lib/alerts";
import type { Portfolio } from "@/lib/portfolio";
import type { Transaction } from "@/lib/transactions";
import type { Watchlist } from "@/lib/watchlist";
import type { DataStatusState } from "@/lib/dataStatus";

export const BACKUP_VERSION = 1 as const;
export const BACKUP_APP = "Investment OS" as const;

export interface BackupData {
  portfolio: Portfolio;
  watchlist: Watchlist;
  alerts: PriceAlert[];
  news: NewsItem[];
  transactions: Transaction[];
  goalSettings: PortfolioGoalSettings;
  dataStatus: DataStatusState;
  fxRates: FXRatesResponse;
}

export interface InvestmentOSBackup {
  version: typeof BACKUP_VERSION;
  app: typeof BACKUP_APP;
  exportedAt: string;
  data: BackupData;
}

export interface BackupSummary {
  exportedAt: string;
  version: number;
  holdingsCount: number;
  cashCount: number;
  watchlistCount: number;
  alertsCount: number;
  newsCount: number;
  transactionsCount: number;
  hasGoals: boolean;
  fxSource: string;
  fxUpdatedAt: string;
}

export type BackupValidationResult =
  | { ok: true; backup: InvestmentOSBackup }
  | { ok: false; error: string };
