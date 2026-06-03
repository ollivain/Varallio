import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/formatters";
import type { Currency } from "@/lib/portfolio/types";
import type { AgentContext } from "./types";

// ── Size limits ────────────────────────────────────────────────────────────────
// Keep the prompt compact to stay within token budget.
const MAX_NEWS_LINES = 5;
const MAX_INSIGHTS_LINES = 6;
const MAX_ACTIONS_LINES = 6;
const MAX_WATCHLIST_RESEARCH_LINES = 6;
const MAX_WATCHLIST_ITEMS = 6;

// ── Helpers ───────────────────────────────────────────────────────────────────

function dataSourceNote(overallStatus: string): string {
  if (overallStatus === "mock") return "(mock/demo data — not live)";
  if (overallStatus === "stale") return "(data may be stale — refresh recommended)";
  if (overallStatus === "partial") return "(some sources are mock/unknown)";
  return "";
}

// ── Main formatter ────────────────────────────────────────────────────────────

export function formatContextForPrompt(context: AgentContext): string {
  const {
    actionSuggestions,
    alerts,
    contributionPlan,
    dataHealthSummary,
    fx,
    goals,
    news,
    onboarding,
    performance,
    portfolio,
    portfolioHistory,
    portfolioInsights,
    scenario,
    selectedCompanySnapshot,
    watchlistResearch,
    watchlist,
    riskSignals,
  } = context;
  const currency = portfolio.baseCurrency;
  const dataNote = dataSourceNote(dataHealthSummary.overallStatus);
  const fxRateLines = fx.rates
    .map((rate) => `${rate.currency}=${rate.rateToEur.toFixed(6)} EUR`)
    .join(", ");
  const fxNote =
    fx.source === "live"
      ? `FX note: All amounts are reported in ${currency} (base currency). Non-${currency} positions are converted using live EUR-based FX rates (${fxRateLines}). Last FX update: ${fx.lastUpdated ?? "unknown"}.`
      : `FX note: All amounts are reported in ${currency} (base currency). Non-${currency} positions are converted using STATIC fallback rates (${fxRateLines}), not live FX — treat cross-currency totals as approximations and avoid strong conclusions when currency exposure could materially change the result.`;

  // ── Portfolio ──────────────────────────────────────────────────────────────
  const allocationLines = portfolio.allocation.map(
    (item) =>
      `- ${item.label}: ${formatCurrency(item.value, { currency })} (${formatPercent(item.percent, 1)})`
  );

  const topHoldingLines =
    portfolio.topHoldings.length > 0
      ? portfolio.topHoldings.map(
          (h) =>
            `- ${h.name} (${h.ticker}): ${formatCurrency(h.value, { currency })}, weight ${formatPercent(h.weightPercent, 1)}, today ${formatSignedPercent(h.dayChangePercent)}, total return ${formatSignedPercent(h.totalReturnPercent)}`
        )
      : ["- No holdings."];

  // ── Watchlist (capped) ─────────────────────────────────────────────────────
  const watchlistLines =
    watchlist.items.length > 0
      ? watchlist.items.slice(0, MAX_WATCHLIST_ITEMS).map((item) => {
          const tags = item.tags.length > 0 ? `, tags: ${item.tags.join(", ")}` : "";
          const notes = item.notes ? `, note: ${item.notes}` : "";
          return `- ${item.name} (${item.ticker}): ${formatNumber(item.price, 2)}, change ${formatSignedPercent(item.changePercent)}${tags}${notes}`;
        })
      : ["- Watchlist is empty."];

  // ── Alerts ────────────────────────────────────────────────────────────────
  const formatAlert = (a: (typeof alerts.activeAlerts)[0]) => {
    const priceStr =
      a.currentPrice !== undefined
        ? `, current price ${formatCurrency(a.currentPrice, { currency: a.currency, decimals: 2 })}`
        : "";
    return `- ${a.name} (${a.ticker}): ${a.direction === "above" ? "above" : "below"} ${formatCurrency(a.targetPrice, { currency: a.currency, decimals: 2 })}${priceStr}${a.note ? `, note: ${a.note}` : ""}`;
  };

  const activeAlertLines =
    alerts.activeAlerts.length > 0
      ? alerts.activeAlerts.map(formatAlert)
      : ["- No active alerts."];

  const triggeredAlertLines =
    alerts.triggeredAlerts.length > 0
      ? alerts.triggeredAlerts.map(formatAlert)
      : ["- No triggered alerts."];

  // ── News (capped, no URL to save tokens) ──────────────────────────────────
  const newsLines =
    news.latestNews.length > 0
      ? news.latestNews.slice(0, MAX_NEWS_LINES).map((item) => {
          const tickers = item.tickers?.length ? ` [${item.tickers.join(", ")}]` : "";
          const sentiment = item.sentiment ? `, ${item.sentiment}` : "";
          const related =
            item.isPortfolioRelated || item.isWatchlistRelated
              ? ` (${[
                  item.isPortfolioRelated ? "portfolio" : "",
                  item.isWatchlistRelated ? "watchlist" : "",
                ]
                  .filter(Boolean)
                  .join("+")})`
              : "";
          const weight =
            item.relatedHoldingWeight !== undefined
              ? `, weight ${formatPercent(item.relatedHoldingWeight, 1)}`
              : "";
          const tags =
            item.impactTags.length > 0 ? `, [${item.impactTags.slice(0, 3).join(", ")}]` : "";
          return `- [${item.priority}${sentiment}${related}] ${item.title}${tickers}${weight}${tags} — ${item.reason}`;
        })
      : ["- No recent news."];

  // ── Risk signals ───────────────────────────────────────────────────────────
  const riskLines =
    riskSignals.length > 0
      ? riskSignals.map((s) => `- [${s.severity}] ${s.label}: ${s.description}`)
      : ["- No rule-based risk signals."];

  // ── Portfolio insights (capped) ────────────────────────────────────────────
  const portfolioInsightLines =
    portfolioInsights.length > 0
      ? portfolioInsights.slice(0, MAX_INSIGHTS_LINES).map((insight) => {
          const metric =
            insight.metricLabel && insight.metricValue
              ? `, ${insight.metricLabel}: ${insight.metricValue}`
              : "";
          const symbols = insight.relatedSymbols?.length
            ? ` [${insight.relatedSymbols.join(", ")}]`
            : "";
          return `- [${insight.severity}/${insight.category}${symbols}] ${insight.title}${metric}: ${insight.description}`;
        })
      : ["- No portfolio insights."];

  // ── Selected company snapshot ──────────────────────────────────────────────
  const companySnapshotLines: string[] = [];
  if (selectedCompanySnapshot) {
    const cs = selectedCompanySnapshot;
    const nameStr = cs.name ? `${cs.name} (${cs.symbol})` : cs.symbol;
    const roles = [
      cs.isHolding ? "portfolio holding" : "",
      cs.isWatchlist ? "watchlist idea" : "",
    ]
      .filter(Boolean)
      .join(" + ");
    const priceStr = cs.price !== undefined ? `, price: ${cs.price.toFixed(2)}` : "";
    const weightStr =
      cs.portfolioWeight !== undefined ? `, weight: ${cs.portfolioWeight.toFixed(1)} %` : "";
    const mvStr =
      cs.marketValue !== undefined ? `, market value: ${cs.marketValue.toFixed(0)}` : "";
    const dayStr =
      cs.dayChangePercent !== undefined
        ? `, day: ${cs.dayChangePercent >= 0 ? "+" : ""}${cs.dayChangePercent.toFixed(2)} %`
        : "";
    const retStr =
      cs.totalReturnPercent !== undefined
        ? `, total return: ${cs.totalReturnPercent >= 0 ? "+" : ""}${cs.totalReturnPercent.toFixed(1)} %`
        : "";
    const insightStr =
      cs.insights.length > 0
        ? cs.insights.slice(0, 4).map((i) => `  • ${i}`).join("\n")
        : "  • No additional insights.";
    const newsStr =
      cs.newsCount > 0
        ? `  News: ${cs.newsCount} items (${cs.highPriorityNewsCount} high priority), sentiment: ${cs.sentiment}`
        : "  News: none";
    const tagsStr = cs.tags.length > 0 ? `  Tags: ${cs.tags.join(", ")}` : "";

    companySnapshotLines.push(
      `${nameStr} [${roles}]${priceStr}${weightStr}${mvStr}${dayStr}${retStr}`,
      insightStr,
      newsStr,
      ...(tagsStr ? [tagsStr] : [])
    );
  } else {
    companySnapshotLines.push("- No company selected.");
  }

  // ── Watchlist research (capped) ────────────────────────────────────────────
  const watchlistResearchLines =
    watchlistResearch.length > 0
      ? watchlistResearch.slice(0, MAX_WATCHLIST_RESEARCH_LINES).map((item) => {
          const tags = item.tags.length > 0 ? ` [${item.tags.slice(0, 3).join(", ")}]` : "";
          const newsStr =
            item.newsCount > 0
              ? `, ${item.newsCount} news (${item.highPriorityNewsCount} high)`
              : ", no news";
          return `- [${item.priority}/${item.sentiment}] ${item.name} (${item.symbol})${tags}${newsStr}: ${item.reason}`;
        })
      : ["- Watchlist research is empty."];

  // ── Action suggestions (capped) ────────────────────────────────────────────
  const actionSuggestionLines =
    actionSuggestions.length > 0
      ? actionSuggestions.slice(0, MAX_ACTIONS_LINES).map((action) => {
          const symbols = action.relatedSymbols?.length
            ? ` [${action.relatedSymbols.join(", ")}]`
            : "";
          return `- [${action.priority}/${action.type}] ${action.title}${symbols}: ${action.description}`;
        })
      : ["- No action suggestions."];

  // ── Data health ────────────────────────────────────────────────────────────
  const dataHealthLines =
    dataHealthSummary.items.length > 0
      ? dataHealthSummary.items.map(
          (item) =>
            `- ${item.label}: ${item.source} / ${item.status}${item.lastUpdated ? `, updated ${item.lastUpdated}` : ""}`
        )
      : ["- Data health unknown."];

  // ── Goals & allocation drift ──────────────────────────────────────────────
  const goalsLines: string[] = [];
  if (!goals.hasGoals) {
    goalsLines.push("- No allocation targets set. User can configure goals in EditGoalsModal.");
  } else {
    if (goals.monthlyContributionTarget) {
      goalsLines.push(`Monthly contribution target: ${formatCurrency(goals.monthlyContributionTarget, { currency })}`);
    }
    goalsLines.push(`Total target allocation sum: ${formatPercent(goals.totalTargetPercent, 0)}`);
    if (goals.topDrifts.length > 0) {
      goalsLines.push("Allocation drift (current vs target):");
      for (const d of goals.topDrifts) {
        const sign = d.driftPercent >= 0 ? "+" : "";
        goalsLines.push(
          `- ${d.label}: current ${formatPercent(d.currentPercent, 1)} / target ${formatPercent(d.targetPercent, 0)} / drift ${sign}${d.driftPercent.toFixed(1)} pp [${d.status}]`
        );
      }
    }
    if (goals.overweightLabels.length > 0) {
      goalsLines.push(`Overweight vs target: ${goals.overweightLabels.join(", ")}`);
    }
    if (goals.underweightLabels.length > 0) {
      goalsLines.push(`Underweight vs target: ${goals.underweightLabels.join(", ")}`);
    }
  }

  // ── Portfolio history summary ─────────────────────────────────────────────
  const historyLines: string[] = [];
  if (!portfolioHistory.hasHistory) {
    historyLines.push("- No cash-flow history. User has not added transactions yet.");
  } else {
    const retStr =
      portfolioHistory.estimatedReturnPercent !== null
        ? `, estimated return: ${portfolioHistory.estimatedReturnPercent >= 0 ? "+" : ""}${portfolioHistory.estimatedReturnPercent.toFixed(1)} %`
        : "";
    historyLines.push(
      `Period: ${portfolioHistory.firstDate ?? "?"} → ${portfolioHistory.lastDate ?? "?"} (${portfolioHistory.periodMonths} months, ${portfolioHistory.pointCount} data points)`,
      `Deposits: ${formatCurrency(portfolioHistory.totalDeposits, { currency })} | Withdrawals: ${formatCurrency(portfolioHistory.totalWithdrawals, { currency })} | Net: ${formatCurrency(portfolioHistory.netContributions, { currency })}`,
      `Dividends: ${formatCurrency(portfolioHistory.totalDividends, { currency })} | Fees: ${formatCurrency(portfolioHistory.totalFees, { currency })}`,
      `Current value: ${formatCurrency(portfolioHistory.currentValue, { currency })} | Estimated gain/loss: ${formatSignedCurrency(portfolioHistory.estimatedGainLoss, { currency })}${retStr}`
    );
  }

  // ── Transaction performance ───────────────────────────────────────────────
  const performanceLines: string[] = [];
  if (!performance.hasTransactions) {
    performanceLines.push("- No transaction history. Ask user to add transactions for accurate return tracking.");
  } else {
    const retStr =
      performance.simpleReturnPercent !== null
        ? `, simple return: ${performance.simpleReturnPercent >= 0 ? "+" : ""}${performance.simpleReturnPercent.toFixed(1)} %`
        : "";
    performanceLines.push(
      `Transactions: ${performance.transactionCount}, period: ${performance.firstTransactionDate ?? "?"} – ${performance.lastTransactionDate ?? "?"}`,
      `Deposits: ${formatCurrency(performance.totalDeposits, { currency })} | Withdrawals: ${formatCurrency(performance.totalWithdrawals, { currency })} | Net contributions: ${formatCurrency(performance.netContributions, { currency })}`,
      `Simple gain/loss: ${formatSignedCurrency(performance.simpleGainLoss, { currency })}${retStr}`,
      `Dividends received: ${formatCurrency(performance.realizedDividends, { currency })} | Fees paid: ${formatCurrency(performance.totalFees, { currency })}`
    );
    if (performance.recentTransactions.length > 0) {
      performanceLines.push("Recent transactions (latest first):");
      for (const tx of performance.recentTransactions) {
        const sym = tx.symbol ? ` ${tx.symbol}` : "";
        const qty = tx.quantity && tx.price ? ` ${tx.quantity} @ ${tx.price}` : "";
        const txCurrency = tx.currency as Currency;
        performanceLines.push(
          `- [${tx.date}] ${tx.type}${sym}${qty}: ${formatCurrency(tx.amount, { currency: txCurrency })}${tx.note ? ` (${tx.note})` : ""}`
        );
      }
    }
    if (performance.topUnrealizedGains.length > 0) {
      const gains = performance.topUnrealizedGains
        .map((p) => `${p.symbol} ${p.unrealizedGainPercent >= 0 ? "+" : ""}${p.unrealizedGainPercent.toFixed(1)} %`)
        .join(", ");
      performanceLines.push(`Top unrealized gains: ${gains}`);
    }
    if (performance.topUnrealizedLosses.length > 0) {
      const losses = performance.topUnrealizedLosses
        .map((p) => `${p.symbol} ${p.unrealizedGainPercent.toFixed(1)} %`)
        .join(", ");
      performanceLines.push(`Top unrealized losses: ${losses}`);
    }
  }

  // ── Assemble ───────────────────────────────────────────────────────────────
  return [
    `Context: ${context.asOf}${dataNote ? " " + dataNote : ""}`,
    fxNote,
    "",
    `Portfolio: ${portfolio.portfolioName} | ${currency} | Value: ${formatCurrency(portfolio.totalValue, { currency })} | Day: ${formatSignedCurrency(portfolio.dayChangeValue, { currency })} (${formatSignedPercent(portfolio.dayChangePercent)}) | Return: ${formatSignedCurrency(portfolio.totalReturnValue, { currency })} (${formatSignedPercent(portfolio.totalReturnPercent)})`,
    "",
    "Allocation:",
    ...allocationLines,
    "",
    "Top holdings (by value):",
    ...topHoldingLines,
    "",
    `Watchlist (${watchlist.items.length} items):`,
    ...watchlistLines,
    "",
    "Alerts — triggered:",
    ...triggeredAlertLines,
    "Alerts — active:",
    ...activeAlertLines,
    "",
    `News intelligence [source: ${news.providerSource}]:`,
    "INSTRUCTION: Lift high priority first. Explain relevance. If mock source, note demo data.",
    ...newsLines,
    "",
    "Portfolio insights [primary dashboard summary]:",
    "INSTRUCTION: Lift critical/warning first. State the data behind each insight.",
    ...portfolioInsightLines,
    "",
    "Selected company snapshot [user is currently viewing this]:",
    "INSTRUCTION: If user asks about 'this', 'selected', or the ticker, use this data. Holding = owned; watchlist = research idea only.",
    ...companySnapshotLines,
    "",
    "Watchlist research [research ideas, not buy/sell]:",
    "INSTRUCTION: High priority = recent impactful news or negative sentiment. Use 'worth monitoring' language.",
    ...watchlistResearchLines,
    "",
    "Action suggestions [safe next steps]:",
    "INSTRUCTION: Frame as review/monitor/compare/ask/update — never as buy/sell orders.",
    ...actionSuggestionLines,
    "",
    `Data health [overall: ${dataHealthSummary.overallStatus}]:`,
    "INSTRUCTION: If mock/stale, say so when drawing conclusions. Suggest refresh before strong conclusions.",
    ...dataHealthLines,
    ...dataHealthSummary.warnings.map((w) => `- Warning: ${w}`),
    "",
    "Risk signals:",
    ...riskLines,
    "",
    "Transaction history & performance [simple return, not time-weighted]:",
    "INSTRUCTION: Simple return = (current value + withdrawals - deposits) / deposits. Not TWRR or IRR. Note this when quoting return figures. If no transactions, tell user to add them for accurate tracking.",
    ...performanceLines,
    "",
    "Portfolio cash-flow history [deposits & withdrawals over time, NOT historical prices]:",
    "INSTRUCTION: This is cash-flow data only — deposits minus withdrawals versus current market value. We do NOT have historical market prices. Always call this 'estimated return' or 'arvioitu tuotto', never 'exact return'. Accurate historical performance requires per-day price data.",
    ...historyLines,
    "",
    "Active what-if scenario [hypothetical only — does NOT change real portfolio]:",
    "INSTRUCTION: This is HYPOTHETICAL. Always say 'jos tämä skenaario toteutuisi' / 'if this scenario occurred'. Never treat it as a real trade or action. Explain impact on value, allocation, and goals. Do NOT say 'buy' or 'sell'.",
    scenario
      ? [
          `Type: ${scenario.type} | Label: ${scenario.label}`,
          `Base value: ${formatCurrency(scenario.basePortfolioValue, { currency })} → Projected: ${formatCurrency(scenario.projectedPortfolioValue, { currency })} (${scenario.valueChange >= 0 ? "+" : ""}${formatCurrency(scenario.valueChange, { currency })}, ${scenario.valueChangePercent >= 0 ? "+" : ""}${scenario.valueChangePercent.toFixed(1)} %)`,
          `Summary: ${scenario.summary}`,
          ...(scenario.affectedCategories.length > 0
            ? [`Affected categories: ${scenario.affectedCategories.join(", ")}`]
            : []),
          ...(scenario.affectedSymbols.length > 0
            ? [`Affected symbols: ${scenario.affectedSymbols.slice(0, 5).join(", ")}`]
            : []),
          ...(scenario.topDriftChanges.length > 0
            ? [
                "Drift changes vs target:",
                ...scenario.topDriftChanges.map(
                  (d) =>
                    `  - ${d.label}: drift ${d.driftBefore >= 0 ? "+" : ""}${d.driftBefore.toFixed(1)} pp → ${d.driftAfter >= 0 ? "+" : ""}${d.driftAfter.toFixed(1)} pp (muutos ${d.changePP >= 0 ? "+" : ""}${d.changePP.toFixed(1)} pp)`
                ),
              ]
            : []),
          ...(scenario.warnings.length > 0
            ? [`Warnings: ${scenario.warnings.join("; ")}`]
            : []),
        ].join("\n")
      : "- No active scenario.",
    "",
    "Setup / onboarding status [reflects whether app is configured with real data]:",
    "INSTRUCTION: If user asks about setup, next steps, or dashboard readiness — use this. If setup is incomplete, remind user to complete it before trusting analytics. Do NOT give strong investment conclusions when data is mock or missing.",
    onboarding.isComplete
      ? `Setup complete: ${onboarding.completedSteps}/${onboarding.totalSteps} steps done. Dashboard is configured with real data.`
      : [
          `Setup incomplete: ${onboarding.completedSteps}/${onboarding.totalSteps} steps done.`,
          onboarding.pendingTitles.length > 0
            ? `Pending: ${onboarding.pendingTitles.join("; ")}.`
            : "",
          onboarding.nextStepTitle
            ? `Recommended next step: ${onboarding.nextStepTitle}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
    "",
    "Allocation goals & drift [user's own target allocation plan]:",
    "INSTRUCTION: These are the USER'S OWN goals — not recommendations. Use 'tavoitteeseesi verrattuna' / 'compared to your target'. Never tell user to buy or sell. Frame as 'review', 'compare', 'monitor'. If goals not set, suggest user configures them.",
    ...goalsLines,
    "",
    `Contribution planner [planning tool, ${formatCurrency(contributionPlan.contributionAmount, { currency })} contribution]:`,
    "INSTRUCTION: This is a PLANNING tool, not a buy/sell recommendation. Speak in categories (e.g. 'Osakkeet'), not individual stocks. Use 'jos haluat lähestyä tavoiteallokaatiota' language. Never say 'buy X'. Always remind user this is based on their own goals.",
    contributionPlan.hasGoals
      ? [
          `Summary: ${contributionPlan.summary}`,
          contributionPlan.primaryFocusLabel
            ? `Primary focus: ${contributionPlan.primaryFocusLabel} (${formatCurrency(contributionPlan.primaryFocusSuggestedAmount ?? 0, { currency })} suggested)`
            : "- No primary focus (all near target or no underweight)",
          `Allocated: ${formatCurrency(contributionPlan.totalAllocated, { currency })} / Unallocated: ${formatCurrency(contributionPlan.unallocatedAmount, { currency })}`,
          ...(contributionPlan.topItems.length > 0
            ? [
                "Top items:",
                ...contributionPlan.topItems.map(
                  (i) =>
                    `  - ${i.label}: ${formatCurrency(i.suggestedAmount, { currency })} → ${formatPercent(i.projectedPercent, 1)} (was ${formatPercent(i.currentPercent, 1)})`
                ),
              ]
            : ["- No items with suggested amounts"]),
        ].join("\n")
      : "- No goals set — contribution plan unavailable.",
  ].join("\n");
}
