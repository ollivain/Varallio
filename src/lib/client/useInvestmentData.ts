"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { mockAlerts, type PriceAlert } from "@/lib/alerts";
import type { DataSourceKind, DataStatusState } from "@/lib/dataStatus";
import { getStaticFxRates, type FXRatesResponse } from "@/lib/currency";
import { mockNews, type NewsItem } from "@/lib/news";
import { mockPortfolio, type Portfolio } from "@/lib/portfolio";
import { mockWatchlist, type Watchlist } from "@/lib/watchlist";
import { mockTransactions, type Transaction } from "@/lib/transactions";
import { defaultGoalSettings, type PortfolioGoalSettings } from "@/lib/goals";

const PORTFOLIO_STORAGE_KEY = "investment-os:portfolio";
const WATCHLIST_STORAGE_KEY = "investment-os:watchlist";
const ALERTS_STORAGE_KEY = "investment-os:alerts";
const NEWS_STORAGE_KEY = "investment-os:news";
const DATA_STATUS_STORAGE_KEY = "investment-os:data-status";
const TRANSACTIONS_STORAGE_KEY = "investment-os:transactions";
const GOALS_STORAGE_KEY = "investment-os:goals";
const FX_RATES_STORAGE_KEY = "investment-os:fx-rates";

const DEFAULT_DATA_STATUS: DataStatusState = {
  agentSource: "unknown",
  fxSource: "static",
  marketSource: "mock",
  newsSource: "mock",
};

interface UseInvestmentDataResult {
  portfolio: Portfolio;
  watchlist: Watchlist;
  alerts: PriceAlert[];
  news: NewsItem[];
  transactions: Transaction[];
  goalSettings: PortfolioGoalSettings;
  fxRates: FXRatesResponse;
  setPortfolio: Dispatch<SetStateAction<Portfolio>>;
  setWatchlist: Dispatch<SetStateAction<Watchlist>>;
  setAlerts: Dispatch<SetStateAction<PriceAlert[]>>;
  setNews: Dispatch<SetStateAction<NewsItem[]>>;
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setFxRates: Dispatch<SetStateAction<FXRatesResponse>>;
  addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => void;
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, "id" | "createdAt">>) => void;
  dataStatus: DataStatusState;
  updateAgentDataStatus: (source: DataSourceKind) => void;
  updateFxDataStatus: (source: DataSourceKind, updatedAt?: string) => void;
  updateMarketDataStatus: (source: DataSourceKind) => void;
  updateNewsDataStatus: (source: DataSourceKind) => void;
  refreshFxRates: () => Promise<FXRatesResponse>;
  resetPortfolio: () => void;
  resetWatchlist: () => void;
  resetAlerts: () => void;
  resetNews: () => void;
  resetDataStatus: () => void;
  resetTransactions: () => void;
  updateGoalSettings: (settings: PortfolioGoalSettings) => void;
  resetGoalSettings: () => void;
  isLoaded: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isValidPortfolio(value: unknown): value is Portfolio {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === "string" &&
    typeof value.baseCurrency === "string" &&
    Array.isArray(value.holdings) &&
    Array.isArray(value.cash)
  );
}

function isValidWatchlist(value: unknown): value is Watchlist {
  if (!isRecord(value)) return false;

  return typeof value.name === "string" && Array.isArray(value.items);
}

function isValidAlert(value: unknown): value is PriceAlert {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.ticker === "string" &&
    typeof value.targetPrice === "number" &&
    (value.direction === "above" || value.direction === "below") &&
    typeof value.currency === "string" &&
    (value.status === "active" || value.status === "triggered")
  );
}

function isValidAlerts(value: unknown): value is PriceAlert[] {
  return Array.isArray(value) && value.every(isValidAlert);
}

function isValidNewsItem(value: unknown): value is NewsItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.source === "string" &&
    typeof value.publishedAt === "string"
  );
}

function isValidNews(value: unknown): value is NewsItem[] {
  return Array.isArray(value) && value.every(isValidNewsItem);
}

const VALID_TRANSACTION_TYPES = new Set([
  "buy",
  "sell",
  "deposit",
  "withdrawal",
  "dividend",
  "fee",
]);

function isValidTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    VALID_TRANSACTION_TYPES.has(value.type as string) &&
    typeof value.amount === "number" &&
    typeof value.currency === "string" &&
    typeof value.date === "string" &&
    typeof value.createdAt === "string"
  );
}

function isValidTransactions(value: unknown): value is Transaction[] {
  return Array.isArray(value) && value.every(isValidTransaction);
}

function isValidGoalSettings(value: unknown): value is PortfolioGoalSettings {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.allocationTargets)) return false;
  return value.allocationTargets.every(
    (t: unknown) =>
      isRecord(t) &&
      typeof t.id === "string" &&
      typeof t.label === "string" &&
      typeof t.key === "string" &&
      typeof t.targetPercent === "number"
  );
}

function isDataSourceKind(value: unknown): value is DataSourceKind {
  return (
    value === "live" ||
    value === "mock" ||
    value === "fallback" ||
    value === "static" ||
    value === "unknown"
  );
}

function isOptionalIsoString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isValidDataStatus(value: unknown): value is DataStatusState {
  if (!isRecord(value)) return false;

  return (
    isDataSourceKind(value.marketSource) &&
    isDataSourceKind(value.newsSource) &&
    isDataSourceKind(value.agentSource) &&
    isDataSourceKind(value.fxSource) &&
    isOptionalIsoString(value.marketLastUpdated) &&
    isOptionalIsoString(value.newsLastUpdated) &&
    isOptionalIsoString(value.agentLastUpdated) &&
    isOptionalIsoString(value.fxLastUpdated)
  );
}

function isValidFxRatesResponse(value: unknown): value is FXRatesResponse {
  if (!isRecord(value)) return false;

  return (
    value.baseCurrency === "EUR" &&
    (value.source === "live" || value.source === "static") &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.rates) &&
    value.rates.every(
      (rate) =>
        isRecord(rate) &&
        typeof rate.currency === "string" &&
        typeof rate.rateToEur === "number" &&
        Number.isFinite(rate.rateToEur) &&
        (rate.source === "live" || rate.source === "static") &&
        typeof rate.updatedAt === "string"
    )
  );
}

function readStoredValue<T>(
  key: string,
  validator: (value: unknown) => value is T
): T | null {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue);
    if (!validator(parsedValue)) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsedValue;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage cleanup failures.
    }
    return null;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the UI usable if localStorage is unavailable or full.
  }
}

function removeStoredValue(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Keep reset actions safe in constrained browser environments.
  }
}

function generateId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useInvestmentData(): UseInvestmentDataResult {
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [watchlist, setWatchlist] = useState<Watchlist>(mockWatchlist);
  const [alerts, setAlerts] = useState<PriceAlert[]>(mockAlerts);
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [goalSettings, setGoalSettings] = useState<PortfolioGoalSettings>(defaultGoalSettings);
  const [dataStatus, setDataStatus] = useState<DataStatusState>(DEFAULT_DATA_STATUS);
  const [fxRates, setFxRates] = useState<FXRatesResponse>(() => getStaticFxRates());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedPortfolio = readStoredValue(PORTFOLIO_STORAGE_KEY, isValidPortfolio);
    const storedWatchlist = readStoredValue(WATCHLIST_STORAGE_KEY, isValidWatchlist);
    const storedAlerts = readStoredValue(ALERTS_STORAGE_KEY, isValidAlerts);
    const storedNews = readStoredValue(NEWS_STORAGE_KEY, isValidNews);
    const storedDataStatus = readStoredValue(DATA_STATUS_STORAGE_KEY, isValidDataStatus);
    const storedTransactions = readStoredValue(TRANSACTIONS_STORAGE_KEY, isValidTransactions);
    const storedGoalSettings = readStoredValue(GOALS_STORAGE_KEY, isValidGoalSettings);
    const storedFxRates = readStoredValue(FX_RATES_STORAGE_KEY, isValidFxRatesResponse);

    if (storedPortfolio) setPortfolio(storedPortfolio);
    if (storedWatchlist) setWatchlist(storedWatchlist);
    if (storedAlerts) setAlerts(storedAlerts);
    if (storedNews) setNews(storedNews);
    if (storedDataStatus) setDataStatus(storedDataStatus);
    if (storedTransactions) setTransactions(storedTransactions);
    if (storedGoalSettings) setGoalSettings(storedGoalSettings);
    if (storedFxRates) setFxRates(storedFxRates);

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(PORTFOLIO_STORAGE_KEY, portfolio);
  }, [isLoaded, portfolio]);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(WATCHLIST_STORAGE_KEY, watchlist);
  }, [isLoaded, watchlist]);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(ALERTS_STORAGE_KEY, alerts);
  }, [alerts, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(NEWS_STORAGE_KEY, news);
  }, [isLoaded, news]);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(DATA_STATUS_STORAGE_KEY, dataStatus);
  }, [dataStatus, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(TRANSACTIONS_STORAGE_KEY, transactions);
  }, [isLoaded, transactions]);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(GOALS_STORAGE_KEY, goalSettings);
  }, [isLoaded, goalSettings]);

  useEffect(() => {
    if (!isLoaded) return;
    writeStoredValue(FX_RATES_STORAGE_KEY, fxRates);
  }, [fxRates, isLoaded]);

  function updateMarketDataStatus(source: DataSourceKind) {
    setDataStatus((currentStatus) => ({
      ...currentStatus,
      marketLastUpdated: new Date().toISOString(),
      marketSource: source,
    }));
  }

  function updateNewsDataStatus(source: DataSourceKind) {
    setDataStatus((currentStatus) => ({
      ...currentStatus,
      newsLastUpdated: new Date().toISOString(),
      newsSource: source,
    }));
  }

  function updateAgentDataStatus(source: DataSourceKind) {
    setDataStatus((currentStatus) => ({
      ...currentStatus,
      agentLastUpdated: new Date().toISOString(),
      agentSource: source,
    }));
  }

  function updateFxDataStatus(source: DataSourceKind, updatedAt = new Date().toISOString()) {
    setDataStatus((currentStatus) => ({
      ...currentStatus,
      fxLastUpdated: updatedAt,
      fxSource: source,
    }));
  }

  async function refreshFxRates(): Promise<FXRatesResponse> {
    try {
      const response = await fetch("/api/fx/rates");
      if (!response.ok) {
        throw new Error(`/api/fx/rates returned ${response.status}`);
      }

      const data = (await response.json()) as unknown;
      if (!isValidFxRatesResponse(data)) {
        throw new Error("/api/fx/rates returned invalid payload");
      }

      setFxRates(data);
      updateFxDataStatus(data.source, data.updatedAt);
      return data;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[useInvestmentData] FX refresh failed, using static fallback:",
          err instanceof Error ? err.message : String(err)
        );
      }
      const fallback = getStaticFxRates();
      setFxRates(fallback);
      updateFxDataStatus("static", fallback.updatedAt);
      return fallback;
    }
  }

  function resetPortfolio() {
    setPortfolio(mockPortfolio);
    removeStoredValue(PORTFOLIO_STORAGE_KEY);
  }

  function resetWatchlist() {
    setWatchlist(mockWatchlist);
    removeStoredValue(WATCHLIST_STORAGE_KEY);
  }

  function resetAlerts() {
    setAlerts(mockAlerts);
    removeStoredValue(ALERTS_STORAGE_KEY);
  }

  function resetNews() {
    setNews(mockNews);
    removeStoredValue(NEWS_STORAGE_KEY);
  }

  function resetDataStatus() {
    setDataStatus(DEFAULT_DATA_STATUS);
    removeStoredValue(DATA_STATUS_STORAGE_KEY);
  }

  function resetTransactions() {
    setTransactions(mockTransactions);
    removeStoredValue(TRANSACTIONS_STORAGE_KEY);
  }

  function updateGoalSettings(settings: PortfolioGoalSettings) {
    setGoalSettings({ ...settings, updatedAt: new Date().toISOString() });
  }

  function resetGoalSettings() {
    setGoalSettings(defaultGoalSettings);
    removeStoredValue(GOALS_STORAGE_KEY);
  }

  function addTransaction(tx: Omit<Transaction, "id" | "createdAt">) {
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
  }

  function removeTransaction(id: string) {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }

  function updateTransaction(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>
  ) {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  }

  return {
    portfolio,
    watchlist,
    alerts,
    news,
    transactions,
    goalSettings,
    fxRates,
    dataStatus,
    setPortfolio,
    setWatchlist,
    setAlerts,
    setNews,
    setTransactions,
    setFxRates,
    addTransaction,
    removeTransaction,
    updateTransaction,
    updateAgentDataStatus,
    updateFxDataStatus,
    updateMarketDataStatus,
    updateNewsDataStatus,
    refreshFxRates,
    resetPortfolio,
    resetWatchlist,
    resetAlerts,
    resetNews,
    resetDataStatus,
    resetTransactions,
    updateGoalSettings,
    resetGoalSettings,
    isLoaded,
  };
}
