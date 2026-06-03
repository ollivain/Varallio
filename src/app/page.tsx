"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AssistantPanel from "@/components/AssistantPanel";
import AlertsManager from "@/components/AlertsManager";
import AddTransactionModal from "@/components/AddTransactionModal";
import AllocationTargetsCard from "@/components/AllocationTargetsCard";
import EditGoalsModal from "@/components/EditGoalsModal";
import RebalancePlannerCard from "@/components/RebalancePlannerCard";
import ScenarioSimulatorCard from "@/components/ScenarioSimulatorCard";
import OnboardingChecklistCard from "@/components/OnboardingChecklistCard";
import RestoreBackupModal from "@/components/RestoreBackupModal";
import ImportTransactionsModal from "@/components/ImportTransactionsModal";
import DataControls from "@/components/DataControls";
import HoldingsManager from "@/components/HoldingsManager";
import NewsManager from "@/components/NewsManager";
import PerformanceSummaryCard from "@/components/PerformanceSummaryCard";
import PortfolioHistoryCard from "@/components/PortfolioHistoryCard";
import TransactionsCard from "@/components/TransactionsCard";
import WatchlistManager from "@/components/WatchlistManager";
import MetricCard from "@/components/MetricCard";
import WatchlistCard from "@/components/WatchlistCard";
import AllocationCard from "@/components/AllocationCard";
import NewsCard from "@/components/NewsCard";
import AlertsCard from "@/components/AlertsCard";
import PortfolioInsightsCard from "@/components/PortfolioInsightsCard";
import ActionSuggestionsCard from "@/components/ActionSuggestionsCard";
import DataStatusCard from "@/components/DataStatusCard";
import TodayBriefCard from "@/components/TodayBriefCard";
import WatchlistResearchCard from "@/components/WatchlistResearchCard";
import CompanySnapshotCard from "@/components/CompanySnapshotCard";
import { buildDataHealthSummary } from "@/lib/dataStatus";
import { fxRatesResponseToMap } from "@/lib/currency";
import { buildCompanySnapshot } from "@/lib/company";
import { calculateAllocationByAssetType, calculateHoldingValue, calculatePortfolioSummary } from "@/lib/portfolio";
import { buildAllocationDrift, buildContributionPlan } from "@/lib/goals";
import type { ScenarioResult } from "@/lib/scenarios";
import type { BackupData } from "@/lib/backup";
import { buildOnboardingChecklist } from "@/lib/onboarding";
import { buildPortfolioHistory, buildPortfolioPerformance } from "@/lib/transactions";
import { useInvestmentData } from "@/lib/client/useInvestmentData";
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from "@/lib/formatters";
import type { NewsProviderResult, NewsProviderSource } from "@/lib/news";
import {
  applyQuotesToPortfolio,
  applyQuotesToWatchlist,
  getUniqueTickersFromPortfolioAndWatchlist,
  type MarketDataError,
  type MarketQuote,
} from "@/lib/market";

export default function DashboardPage() {
  const [isHoldingsManagerOpen, setIsHoldingsManagerOpen] = useState(false);
  const [isWatchlistManagerOpen, setIsWatchlistManagerOpen] = useState(false);
  const [isAlertsManagerOpen, setIsAlertsManagerOpen] = useState(false);
  const [isNewsManagerOpen, setIsNewsManagerOpen] = useState(false);
  const [isDataControlsOpen, setIsDataControlsOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditGoalsOpen, setIsEditGoalsOpen] = useState(false);
  const [isRestoreBackupOpen, setIsRestoreBackupOpen] = useState(false);
  const [currentScenarioResult, setCurrentScenarioResult] = useState<ScenarioResult | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<import("@/lib/transactions").Transaction | undefined>(undefined);
  const [externalAgentPrompt, setExternalAgentPrompt] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const {
    addTransaction,
    alerts,
    dataStatus,
    fxRates,
    goalSettings,
    isLoaded,
    news,
    portfolio,
    removeTransaction,
    resetAlerts,
    resetDataStatus,
    resetGoalSettings,
    resetNews,
    resetPortfolio,
    resetTransactions,
    resetWatchlist,
    setAlerts,
    setFxRates,
    setNews,
    setPortfolio,
    setTransactions,
    setWatchlist,
    transactions,
    updateAgentDataStatus,
    updateFxDataStatus,
    refreshFxRates,
    updateGoalSettings,
    updateMarketDataStatus,
    updateNewsDataStatus,
    updateTransaction,
    watchlist,
  } = useInvestmentData();

  const fxRateMap = useMemo(() => fxRatesResponseToMap(fxRates), [fxRates]);

  const isFirstUse =
    isLoaded &&
    portfolio.holdings.length === 0 &&
    watchlist.items.length === 0;

  const portfolioTotalValue = useMemo(
    () => calculatePortfolioSummary(portfolio, fxRateMap).totalValue,
    [fxRateMap, portfolio]
  );

  const performance = useMemo(
    () =>
      buildPortfolioPerformance(
        transactions,
        portfolio.holdings,
        portfolioTotalValue,
        fxRateMap
      ),
    [transactions, portfolio.holdings, portfolioTotalValue, fxRateMap]
  );

  const historySummary = useMemo(
    () => buildPortfolioHistory(transactions, portfolioTotalValue, fxRateMap),
    [transactions, portfolioTotalValue, fxRateMap]
  );

  const baseAllocation = useMemo(
    () => calculateAllocationByAssetType(portfolio, fxRateMap),
    [portfolio, fxRateMap]
  );

  const allocationDrift = useMemo(
    () => buildAllocationDrift(goalSettings, baseAllocation, portfolioTotalValue),
    [goalSettings, baseAllocation, portfolioTotalValue]
  );

  const onboardingChecklist = useMemo(
    () =>
      buildOnboardingChecklist({
        portfolio,
        watchlist,
        transactions,
        goalSettings,
        fxSource: fxRates.source,
        marketSource: dataStatus.marketSource === "live" ? "live" : "mock",
        newsSource: dataStatus.newsSource === "live" ? "live" : "mock",
      }),
    [portfolio, watchlist, transactions, goalSettings, fxRates.source, dataStatus.marketSource, dataStatus.newsSource]
  );

  const contributionPlan = useMemo(
    () =>
      buildContributionPlan(
        goalSettings,
        allocationDrift,
        portfolioTotalValue,
        goalSettings.monthlyContributionTarget ?? 200
      ),
    [goalSettings, allocationDrift, portfolioTotalValue]
  );

  function handleOpenAddTransaction() {
    setEditingTransaction(undefined);
    setIsTransactionModalOpen(true);
  }

  function handleEditTransaction(tx: import("@/lib/transactions").Transaction) {
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  }

  function handleSaveTransaction(
    txData: Omit<import("@/lib/transactions").Transaction, "id" | "createdAt">
  ) {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, txData);
    } else {
      addTransaction(txData);
    }
  }

  function handleImportTransactions(
    rows: Omit<import("@/lib/transactions").Transaction, "id" | "createdAt">[]
  ) {
    for (const row of rows) {
      addTransaction(row);
    }
  }

  function handleRestoreBackup(data: BackupData) {
    setPortfolio(data.portfolio);
    setWatchlist(data.watchlist);
    setAlerts(data.alerts);
    setNews(data.news);
    setTransactions(data.transactions);
    updateGoalSettings(data.goalSettings);
    setFxRates(data.fxRates);
    resetDataStatus();
    updateFxDataStatus(data.fxRates.source, data.fxRates.updatedAt);
  }

  const summary = calculatePortfolioSummary(portfolio, fxRateMap);

  const dataHealthSummary = useMemo(
    () =>
      buildDataHealthSummary({
        agentLastUpdated: dataStatus.agentLastUpdated,
        agentSource: dataStatus.agentSource,
        fxLastUpdated: dataStatus.fxLastUpdated,
        fxSource: dataStatus.fxSource,
        marketLastUpdated: dataStatus.marketLastUpdated,
        marketSource: dataStatus.marketSource,
        newsLastUpdated: dataStatus.newsLastUpdated,
        newsSource: dataStatus.newsSource,
      }),
    [dataStatus]
  );

  const marketDataSource: "api" | "mock" =
    dataStatus.marketSource === "live" ? "api" : "mock";
  const newsSource: NewsProviderSource =
    dataStatus.newsSource === "live" ? "live" : "mock";

  // Default snapshot symbol: explicit selection (if still valid) → largest holding → first watchlist item
  const resolvedSymbol = useMemo(() => {
    const allTickers = new Set<string>([
      ...portfolio.holdings.map((h) => h.ticker.trim().toUpperCase()),
      ...watchlist.items.map((i) => i.ticker.trim().toUpperCase()),
    ]);

    // Use explicit selection only if it still exists in current data
    if (selectedSymbol && allTickers.has(selectedSymbol.trim().toUpperCase())) {
      return selectedSymbol;
    }

    // Fall back to largest holding by market value (base-currency EUR)
    const largest = portfolio.holdings
      .map((h) => ({ ticker: h.ticker, value: calculateHoldingValue(h, fxRateMap) }))
      .sort((a, b) => b.value - a.value)[0];
    if (largest) return largest.ticker;

    // Fall back to first watchlist item
    return watchlist.items[0]?.ticker ?? null;
  }, [selectedSymbol, portfolio.holdings, watchlist.items, fxRateMap]);

  const selectedCompanySnapshot = useMemo(
    () =>
      resolvedSymbol
        ? buildCompanySnapshot(resolvedSymbol, portfolio, watchlist, news, fxRateMap)
        : null,
    [resolvedSymbol, portfolio, watchlist, news, fxRateMap]
  );

  async function handleRefreshPrices(): Promise<{
    source: "api" | "mock";
    hasErrors: boolean;
  }> {
    const tickers = getUniqueTickersFromPortfolioAndWatchlist(portfolio, watchlist);

    const response = await fetch("/api/market/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers }),
    });

    if (!response.ok) {
      throw new Error(`/api/market/quotes returned ${response.status}`);
    }

    const data = (await response.json()) as {
      quotes: MarketQuote[];
      errors: MarketDataError[];
      source: "api" | "mock";
    };

    if (data.errors.length > 0 && process.env.NODE_ENV !== "production") {
      console.warn(
        "[handleRefreshPrices] Tunnistamattomia tickereitä:",
        data.errors.map((e) => e.ticker).join(", ")
      );
    }

    if (data.quotes.length > 0) {
      setPortfolio((prev) => applyQuotesToPortfolio(prev, data.quotes));
      setWatchlist((prev) => applyQuotesToWatchlist(prev, data.quotes));
    }

    updateMarketDataStatus(data.source === "api" ? "live" : "mock");

    return { source: data.source, hasErrors: data.errors.length > 0 };
  }

  async function handleRefreshNews(): Promise<{
    source: "live" | "mock";
    count: number;
  }> {
    const tickers = getUniqueTickersFromPortfolioAndWatchlist(portfolio, watchlist);

    const response = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers }),
    });

    if (!response.ok) {
      throw new Error(`/api/news returned ${response.status}`);
    }

    const data = (await response.json()) as NewsProviderResult;

    setNews(data.items);
    updateNewsDataStatus(data.source);

    return { source: data.source, count: data.items.length };
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#050817" }}>
      {/* Sidebar: 72 px fixed */}
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Assistant panel (desktop only) ─────────────────────────── */}
          <div
            className="hidden lg:flex flex-col p-3 shrink-0"
            style={{ width: 380 }}
          >
            <AssistantPanel
              alerts={alerts}
              externalPrompt={externalAgentPrompt}
              dataHealthSummary={dataHealthSummary}
              fxRates={fxRates}
              marketDataSource={marketDataSource}
              news={news}
              newsSource={newsSource}
              onAgentSourceChange={(source) =>
                updateAgentDataStatus(source === "ai" ? "live" : "mock")
              }
              onExternalPromptHandled={() => setExternalAgentPrompt(null)}
              portfolio={portfolio}
              rates={fxRateMap}
              selectedCompanySnapshot={selectedCompanySnapshot}
              transactions={transactions}
              goalSettings={goalSettings}
              scenarioResult={currentScenarioResult}
              watchlist={watchlist}
            />
          </div>

          {/* ── Main dashboard content ──────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto p-3 pb-6">
            <div className="flex flex-col gap-3 max-w-5xl">

              {/* ── Page header ──────────────────────────────────────────── */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "rgba(148,163,184,0.42)" }}
                  >
                    Portfolio
                  </p>
                  <p className="text-xs" style={{ color: "rgba(203,213,225,0.55)" }}>
                    {portfolio.holdings.length} omistusta
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDataControlsOpen(true)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
                    style={{
                      background: "rgba(255,255,255,0.032)",
                      color: "rgba(203,213,225,0.75)",
                      border: "1px solid rgba(148,163,184,0.09)",
                    }}
                  >
                    Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHoldingsManagerOpen(true)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "rgba(196,181,253,0.88)",
                      border: "1px solid rgba(139,92,246,0.16)",
                    }}
                  >
                    Hallinnoi omistuksia
                  </button>
                </div>
              </div>

              {/* ── 1. Today's brief ─────────────────────────────────────── */}
              <TodayBriefCard
                alerts={alerts}
                dataHealthSummary={dataHealthSummary}
                hasPortfolioData={portfolio.holdings.length > 0 || transactions.length > 0}
                marketDataSource={marketDataSource}
                news={news}
                newsSource={newsSource}
                portfolio={portfolio}
                rates={fxRateMap}
                watchlist={watchlist}
              />

              {/* ── 2. Onboarding checklist ───────────────────────────────── */}
              <OnboardingChecklistCard
                checklist={onboardingChecklist}
                actions={{
                  onOpenHoldingsManager: () => setIsHoldingsManagerOpen(true),
                  onOpenWatchlistManager: () => setIsWatchlistManagerOpen(true),
                  onOpenImportCsv: () => setIsImportModalOpen(true),
                  onOpenEditGoals: () => setIsEditGoalsOpen(true),
                  onOpenDataControls: () => setIsDataControlsOpen(true),
                  onRefreshFx: refreshFxRates,
                }}
              />

              {/* ── 2. Key metrics ───────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard
                  title="Salkun arvo"
                  value={formatCurrency(summary.totalValue)}
                  change={`${formatSignedPercent(summary.dayChangePercent)} tänään`}
                  positive={summary.dayChangeValue >= 0}
                  showSparkline
                />
                <MetricCard
                  title="Päivän muutos"
                  value={formatSignedCurrency(summary.dayChangeValue)}
                  change={formatSignedPercent(summary.dayChangePercent)}
                  positive={summary.dayChangeValue >= 0}
                />
                <MetricCard
                  title="Kokonaistuotto"
                  value={formatSignedCurrency(summary.totalReturnValue)}
                  change={formatSignedPercent(summary.totalReturnPercent)}
                  positive={summary.totalReturnValue >= 0}
                />
              </div>

              {/* ── 3. Performance summary + history ─────────────────────── */}
              <PerformanceSummaryCard
                performance={performance}
                onAddTransaction={handleOpenAddTransaction}
              />

              <PortfolioHistoryCard
                historySummary={historySummary}
                onAddTransaction={handleOpenAddTransaction}
                onImportCSV={() => setIsImportModalOpen(true)}
              />

              {/* ── 4. Intelligence: insights + next steps ───────────────── */}
              <PortfolioInsightsCard
                alerts={alerts}
                allocationDrift={allocationDrift}
                contributionPlan={contributionPlan}
                historySummary={historySummary}
                news={news}
                newsSource={newsSource}
                performance={performance}
                portfolio={portfolio}
                rates={fxRateMap}
                watchlist={watchlist}
              />

              <ActionSuggestionsCard
                alerts={alerts}
                allocationDrift={allocationDrift}
                contributionPlan={contributionPlan}
                dataHealthSummary={dataHealthSummary}
                marketDataSource={marketDataSource}
                news={news}
                newsSource={newsSource}
                onAskAgent={setExternalAgentPrompt}
                portfolio={portfolio}
                rates={fxRateMap}
                scenarioResult={currentScenarioResult}
                watchlist={watchlist}
              />

              {/* ── 4. Data status ────────────────────────────────────────── */}
              <DataStatusCard summary={dataHealthSummary} />

              {/* ── 5. Company snapshot ──────────────────────────────────────── */}
              <CompanySnapshotCard
                onAskAgent={setExternalAgentPrompt}
                onSelectSymbol={setSelectedSymbol}
                portfolio={portfolio}
                selectedSymbol={resolvedSymbol}
                snapshot={selectedCompanySnapshot}
                watchlist={watchlist}
              />

              {/* ── 6. Watchlist research ─────────────────────────────────────── */}
              <WatchlistResearchCard
                news={news}
                onAskAgent={setExternalAgentPrompt}
                onSelectSymbol={setSelectedSymbol}
                portfolio={portfolio}
                rates={fxRateMap}
                watchlist={watchlist}
              />

              {/* ── 7. Allocation targets + allocation chart ─────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AllocationTargetsCard
                  allocationDrift={allocationDrift}
                  goalSettings={goalSettings}
                  onEdit={() => setIsEditGoalsOpen(true)}
                />
                <AllocationCard portfolio={portfolio} rates={fxRateMap} />
              </div>

              {/* ── 8. Rebalance / contribution planner ─────────────────────── */}
              <RebalancePlannerCard
                allocationDrift={allocationDrift}
                goalSettings={goalSettings}
                onAskAgent={setExternalAgentPrompt}
                totalPortfolioValue={portfolioTotalValue}
              />

              {/* ── 9. Scenario simulator ────────────────────────────────────── */}
              <ScenarioSimulatorCard
                allocationDrift={allocationDrift}
                baseAllocation={baseAllocation}
                fxSource={fxRates.source}
                goalSettings={goalSettings}
                onAskAgent={setExternalAgentPrompt}
                onScenarioResult={setCurrentScenarioResult}
                portfolio={portfolio}
                rates={fxRateMap}
              />

              {/* ── 10. Watchlist list ───────────────────────────────────────── */}
              <WatchlistCard
                watchlist={watchlist}
                onManage={() => setIsWatchlistManagerOpen(true)}
              />

              {/* ── 8. Transactions ──────────────────────────────────────────── */}
              <TransactionsCard
                transactions={transactions}
                onAddTransaction={handleOpenAddTransaction}
                onEditTransaction={handleEditTransaction}
                onImportCSV={() => setIsImportModalOpen(true)}
                onRemoveTransaction={removeTransaction}
              />

              {/* ── 8. News + alerts ──────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <NewsCard
                  news={news}
                  newsSource={newsSource}
                  portfolio={portfolio}
                  rates={fxRateMap}
                  watchlist={watchlist}
                  onManage={() => setIsNewsManagerOpen(true)}
                />
                <AlertsCard
                  alerts={alerts}
                  portfolio={portfolio}
                  watchlist={watchlist}
                  onManage={() => setIsAlertsManagerOpen(true)}
                />
              </div>

              {/* ── Disclaimer ────────────────────────────────────────────── */}
              <p
                className="text-[10px] text-center leading-relaxed px-2 pb-2"
                style={{ color: "rgba(148,163,184,0.32)" }}
              >
                Investment OS on henkilökohtainen analyysi- ja seurantatyökalu, ei sijoitusneuvontaa.
                Kaikki data tallennetaan paikallisesti selaimeen.
              </p>

            </div>
          </main>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <HoldingsManager
        isOpen={isHoldingsManagerOpen}
        portfolio={portfolio}
        setPortfolio={setPortfolio}
        onClose={() => setIsHoldingsManagerOpen(false)}
      />
      <WatchlistManager
        isOpen={isWatchlistManagerOpen}
        watchlist={watchlist}
        setWatchlist={setWatchlist}
        onClose={() => setIsWatchlistManagerOpen(false)}
      />
      <AlertsManager
        alerts={alerts}
        isOpen={isAlertsManagerOpen}
        setAlerts={setAlerts}
        onClose={() => setIsAlertsManagerOpen(false)}
      />
      <NewsManager
        isOpen={isNewsManagerOpen}
        news={news}
        setNews={setNews}
        onClose={() => setIsNewsManagerOpen(false)}
      />
      <DataControls
        alerts={alerts}
        dataStatus={dataStatus}
        fxRates={fxRates}
        goalSettings={goalSettings}
        isOpen={isDataControlsOpen}
        news={news}
        portfolio={portfolio}
        resetAlerts={resetAlerts}
        resetDataStatus={resetDataStatus}
        resetGoalSettings={resetGoalSettings}
        resetNews={resetNews}
        resetPortfolio={resetPortfolio}
        resetTransactions={resetTransactions}
        resetWatchlist={resetWatchlist}
        transactions={transactions}
        watchlist={watchlist}
        onClose={() => setIsDataControlsOpen(false)}
        onOpenRestore={() => setIsRestoreBackupOpen(true)}
        onRefreshFxRates={refreshFxRates}
        onRefreshPrices={handleRefreshPrices}
        onRefreshNews={handleRefreshNews}
      />
      <EditGoalsModal
        goalSettings={goalSettings}
        isOpen={isEditGoalsOpen}
        onClose={() => setIsEditGoalsOpen(false)}
        onSave={updateGoalSettings}
      />
      <RestoreBackupModal
        isOpen={isRestoreBackupOpen}
        onClose={() => setIsRestoreBackupOpen(false)}
        onRestore={handleRestoreBackup}
      />
      <AddTransactionModal
        editTransaction={editingTransaction}
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
      />
      <ImportTransactionsModal
        existingTransactions={transactions}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTransactions}
      />
    </div>
  );
}
