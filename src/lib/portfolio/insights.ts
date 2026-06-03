import { calculateAlertRows, type PriceAlert } from "@/lib/alerts";
import { formatCurrency, formatPercent, formatSignedPercent } from "@/lib/formatters";
import { buildNewsInsights, type NewsItem, type NewsProviderSource } from "@/lib/news";
import type { AllocationDrift, ContributionPlan } from "@/lib/goals";
import type { PortfolioHistorySummary, PortfolioPerformance } from "@/lib/transactions";
import type { Watchlist } from "@/lib/watchlist";
import {
  calculateAllocationByAssetType,
  calculateHoldingCost,
  calculateHoldingDayChangePercent,
  calculateHoldingValue,
  calculatePortfolioSummary,
} from "./calculations";
import type { AssetType, Holding, Portfolio } from "./types";
import type { FXRateMap } from "@/lib/currency";

export type PortfolioInsightSeverity = "positive" | "neutral" | "warning" | "critical";

export type PortfolioInsightCategory =
  | "allocation"
  | "risk"
  | "performance"
  | "cash"
  | "news"
  | "alerts"
  | "diversification";

export interface PortfolioInsight {
  id: string;
  title: string;
  description: string;
  severity: PortfolioInsightSeverity;
  category: PortfolioInsightCategory;
  relatedSymbols?: string[];
  metricLabel?: string;
  metricValue?: string;
  priority: number;
}

const SEVERITY_ORDER: Record<PortfolioInsightSeverity, number> = {
  critical: 4,
  warning: 3,
  positive: 2,
  neutral: 1,
};

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function createInsight(insight: PortfolioInsight): PortfolioInsight {
  return insight;
}

function getHoldingStats(portfolio: Portfolio, rates?: FXRateMap) {
  const summary = calculatePortfolioSummary(portfolio, rates);

  return portfolio.holdings
    .map((holding) => {
      const value = calculateHoldingValue(holding, rates);
      const cost = calculateHoldingCost(holding, rates);
      const dayChangePercent = calculateHoldingDayChangePercent(holding);
      const totalReturnPercent = cost !== 0 ? ((value - cost) / cost) * 100 : 0;

      return {
        holding,
        value,
        weightPercent: summary.totalValue !== 0 ? (value / summary.totalValue) * 100 : 0,
        dayChangePercent,
        totalReturnPercent,
      };
    })
    .sort((a, b) => b.value - a.value);
}

function countUniqueValues(holdings: Holding[], key: "sector" | "region" | "currency"): number {
  return new Set(
    holdings
      .map((holding) => holding[key])
      .filter((value): value is string => Boolean(value))
  ).size;
}

function getAllocationPercent(portfolio: Portfolio, type: AssetType, rates?: FXRateMap): number {
  return calculateAllocationByAssetType(portfolio, rates).find((item) => item.type === type)?.percent ?? 0;
}

export function sortPortfolioInsights(insights: PortfolioInsight[]): PortfolioInsight[] {
  return [...insights].sort((a, b) => {
    const severityDelta = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (severityDelta !== 0) return severityDelta;
    return b.priority - a.priority;
  });
}

export function buildPortfolioInsights({
  alerts = [],
  allocationDrift,
  contributionPlan,
  historySummary,
  news = [],
  newsProviderSource = "mock",
  performance,
  portfolio,
  rates,
  watchlist,
}: {
  alerts?: PriceAlert[];
  allocationDrift?: AllocationDrift[];
  contributionPlan?: ContributionPlan;
  historySummary?: PortfolioHistorySummary;
  news?: NewsItem[];
  newsProviderSource?: NewsProviderSource;
  performance?: PortfolioPerformance;
  portfolio: Portfolio;
  rates?: FXRateMap;
  watchlist: Watchlist;
}): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const summary = calculatePortfolioSummary(portfolio, rates);
  const allocation = calculateAllocationByAssetType(portfolio, rates);
  const holdingStats = getHoldingStats(portfolio, rates);
  const largestHolding = holdingStats[0];
  const cashPercent = getAllocationPercent(portfolio, "cash", rates);
  const stockPercent = getAllocationPercent(portfolio, "stock", rates);
  const triggeredAlerts = calculateAlertRows(alerts, portfolio, watchlist).filter(
    (alert) => alert.status === "triggered"
  );
  const newsInsights = buildNewsInsights(news, portfolio, watchlist, rates);
  const highPriorityPortfolioNews = newsInsights.filter(
    (item) => item.priority === "high" && item.isPortfolioRelated
  );
  const negativeHighPriorityPortfolioNews = highPriorityPortfolioNews.filter(
    (item) => item.sentiment === "negative"
  );
  const positiveHighPriorityPortfolioNews = highPriorityPortfolioNews.filter(
    (item) => item.sentiment === "positive"
  );

  if (largestHolding && largestHolding.weightPercent > 25) {
    insights.push(
      createInsight({
        id: "single-position-concentration",
        title: "Yksittäinen omistus korostuu",
        description: `${largestHolding.holding.name} muodostaa suuren osan salkun arvosta.`,
        severity: largestHolding.weightPercent > 35 ? "critical" : "warning",
        category: "risk",
        relatedSymbols: [largestHolding.holding.ticker],
        metricLabel: "Paino",
        metricValue: formatPercent(largestHolding.weightPercent, 1),
        priority: largestHolding.weightPercent > 35 ? 100 : 90,
      })
    );
  }

  if (stockPercent > 80) {
    insights.push(
      createInsight({
        id: "high-stock-allocation",
        title: "Osakepaino on korkea",
        description: "Salkku voi olla herkkä osakemarkkinan lyhyen aikavälin liikkeille.",
        severity: "warning",
        category: "allocation",
        metricLabel: "Osakkeet",
        metricValue: formatPercent(stockPercent, 1),
        priority: 84,
      })
    );
  }

  if (cashPercent < 5 && summary.totalValue > 0) {
    insights.push(
      createInsight({
        id: "low-cash-weight",
        title: "Käteispaino on matala",
        description: "Matala käteispaino voi vähentää joustavuutta markkinaliikkeissä.",
        severity: "warning",
        category: "cash",
        metricLabel: "Käteinen",
        metricValue: formatPercent(cashPercent, 1),
        priority: 72,
      })
    );
  } else if (cashPercent > 30 && portfolio.holdings.length > 0) {
    insights.push(
      createInsight({
        id: "high-cash-weight",
        title: "Käteispaino on suuri",
        description: "Suuri käteisosuus voi pienentää markkinariskiä, mutta myös sijoitusaste on matala.",
        severity: "neutral",
        category: "cash",
        metricLabel: "Käteinen",
        metricValue: formatPercent(cashPercent, 1),
        priority: 34,
      })
    );
  }

  if (triggeredAlerts.length > 0) {
    insights.push(
      createInsight({
        id: "triggered-alerts",
        title: "Hintahälytyksiä on lauennut",
        description: `${triggeredAlerts.length} hälytys liittyy nykyisiin portfolio- tai watchlist-hintoihin.`,
        severity: "warning",
        category: "alerts",
        relatedSymbols: triggeredAlerts.map((alert) => alert.ticker),
        metricLabel: "Hälytykset",
        metricValue: String(triggeredAlerts.length),
        priority: 82,
      })
    );
  }

  if (negativeHighPriorityPortfolioNews.length > 0) {
    insights.push(
      createInsight({
        id: "negative-high-priority-news",
        title: "Negatiivisia korkean prioriteetin uutisia",
        description:
          newsProviderSource === "mock"
            ? "Demo/fallback-uutisissa on negatiivisia portfolioon liittyviä nostoja."
            : "Uutisvirrassa on negatiivisia portfolioon liittyviä nostoja.",
        severity: "warning",
        category: "news",
        relatedSymbols: [
          ...new Set(negativeHighPriorityPortfolioNews.flatMap((item) => item.affectedSymbols)),
        ],
        metricLabel: "Uutiset",
        metricValue: String(negativeHighPriorityPortfolioNews.length),
        priority: 80,
      })
    );
  }

  if (summary.dayChangePercent <= -2) {
    insights.push(
      createInsight({
        id: "negative-day-change",
        title: "Päivän muutos on selvästi negatiivinen",
        description: "Salkun päivän liike on nykyisten hintojen perusteella laskusuuntainen.",
        severity: "warning",
        category: "performance",
        metricLabel: "Päivän muutos",
        metricValue: formatSignedPercent(summary.dayChangePercent),
        priority: 76,
      })
    );
  } else if (summary.dayChangePercent >= 2) {
    insights.push(
      createInsight({
        id: "positive-day-change",
        title: "Päivän muutos on positiivinen",
        description: "Salkku on nykyisten hintojen perusteella nousussa tänään.",
        severity: "positive",
        category: "performance",
        metricLabel: "Päivän muutos",
        metricValue: formatSignedPercent(summary.dayChangePercent),
        priority: 58,
      })
    );
  }

  if (largestHolding && largestHolding.dayChangePercent <= -3) {
    insights.push(
      createInsight({
        id: "largest-holding-down",
        title: "Suurin omistus laskee tänään",
        description: `${largestHolding.holding.name} vaikuttaa negatiivisesti päivän kehitykseen.`,
        severity: "warning",
        category: "performance",
        relatedSymbols: [largestHolding.holding.ticker],
        metricLabel: "Päivän muutos",
        metricValue: formatSignedPercent(largestHolding.dayChangePercent),
        priority: 74,
      })
    );
  }

  const positivePositions = holdingStats.filter((item) => item.totalReturnPercent > 0).length;
  const negativePositions = holdingStats.filter((item) => item.totalReturnPercent < 0).length;

  if (negativePositions > positivePositions && negativePositions >= 2) {
    insights.push(
      createInsight({
        id: "more-negative-positions",
        title: "Useampi positio on tappiolla",
        description: `${negativePositions} omistusta on kokonaistuotolla mitattuna miinuksella.`,
        severity: "neutral",
        category: "performance",
        metricLabel: "Tappiolla",
        metricValue: String(negativePositions),
        priority: 38,
      })
    );
  } else if (positivePositions >= Math.max(2, negativePositions + 1)) {
    insights.push(
      createInsight({
        id: "more-positive-positions",
        title: "Useampi omistus on plussalla",
        description: `${positivePositions} omistusta on kokonaistuotolla mitattuna positiivinen.`,
        severity: "positive",
        category: "performance",
        metricLabel: "Plussalla",
        metricValue: String(positivePositions),
        priority: 44,
      })
    );
  }

  if (positiveHighPriorityPortfolioNews.length > 0) {
    insights.push(
      createInsight({
        id: "positive-high-priority-news",
        title: "Positiivisia uutisia merkittävistä kohteista",
        description:
          newsProviderSource === "mock"
            ? "Demo/fallback-uutisissa on positiivisia portfolioon liittyviä nostoja."
            : "Uutisvirrassa on positiivisia portfolioon liittyviä nostoja.",
        severity: "positive",
        category: "news",
        relatedSymbols: [
          ...new Set(positiveHighPriorityPortfolioNews.flatMap((item) => item.affectedSymbols)),
        ],
        metricLabel: "Uutiset",
        metricValue: String(positiveHighPriorityPortfolioNews.length),
        priority: 42,
      })
    );
  }

  const assetTypes = allocation.filter((item) => item.percent > 0).length;
  const largestWeight = largestHolding?.weightPercent ?? 0;
  if (assetTypes >= 3 && largestWeight < 25) {
    insights.push(
      createInsight({
        id: "balanced-asset-allocation",
        title: "Allokaatio on kohtuullisen hajautunut",
        description: `${assetTypes} asset type -luokkaa on mukana eikä suurin omistus ylitä 25 % painoa.`,
        severity: "positive",
        category: "diversification",
        metricLabel: "Asset type -luokat",
        metricValue: String(assetTypes),
        priority: 40,
      })
    );
  } else if (largestWeight <= 20 && portfolio.holdings.length >= 4) {
    insights.push(
      createInsight({
        id: "no-major-single-position",
        title: "Ei selvää yksittäisen position ylivaltaa",
        description: "Mikään yksittäinen omistus ei ylitä korkeaa keskittymätasoa.",
        severity: "positive",
        category: "diversification",
        metricLabel: "Suurin paino",
        metricValue: formatPercent(largestWeight, 1),
        priority: 36,
      })
    );
  }

  const sectorCount = countUniqueValues(portfolio.holdings, "sector");
  const regionCount = countUniqueValues(portfolio.holdings, "region");
  const currencyCount = countUniqueValues(portfolio.holdings, "currency");
  if (sectorCount >= 3 || regionCount >= 2 || currencyCount >= 2) {
    insights.push(
      createInsight({
        id: "metadata-diversification",
        title: "Salkussa on hajautusdataa useasta kulmasta",
        description: `Sektoreita ${sectorCount || "-"}, alueita ${regionCount || "-"} ja valuuttoja ${currencyCount}.`,
        severity: "neutral",
        category: "diversification",
        priority: 24,
      })
    );
  }

  if (watchlist.items.length > 0 && highPriorityPortfolioNews.length === 0) {
    insights.push(
      createInsight({
        id: "watchlist-monitoring",
        title: "Watchlist tarjoaa seurattavaa",
        description: `${watchlist.items.length} kohdetta on seurannassa ilman selkeää high priority -uutisriskiä.`,
        severity: "neutral",
        category: "diversification",
        metricLabel: "Watchlist",
        metricValue: String(watchlist.items.length),
        priority: 18,
      })
    );
  }

  if (newsInsights.length > 0 && highPriorityPortfolioNews.length === 0) {
    insights.push(
      createInsight({
        id: "news-without-high-priority-risk",
        title: "Uutisia löytyy ilman korkean prioriteetin portfoliohälytystä",
        description:
          newsProviderSource === "mock"
            ? "Demo/fallback-uutiset eivät nosta selkeää high priority -portfolioriskiä."
            : "Nykyiset uutiset eivät nosta selkeää high priority -portfolioriskiä.",
        severity: "neutral",
        category: "news",
        metricLabel: "Uutiset",
        metricValue: String(newsInsights.length),
        priority: 16,
      })
    );
  }

  // ── Allocation drift insights ─────────────────────────────────────────────────
  if (allocationDrift && allocationDrift.length > 0) {
    const bigDrifts = allocationDrift.filter(
      (d) => Math.abs(d.driftPercent) >= 10
    );
    const onTarget = allocationDrift.every((d) => Math.abs(d.driftPercent) <= 5);

    for (const drift of bigDrifts.slice(0, 2)) {
      const direction = drift.status === "overweight" ? "yli" : "ali";
      insights.push(
        createInsight({
          id: `drift-${drift.key}`,
          title: `${drift.label} on selvästi ${direction} tavoitteen`,
          description: `Tavoite ${drift.targetPercent.toFixed(0)} %, nyt ${drift.currentPercent.toFixed(1)} % (${drift.driftPercent >= 0 ? "+" : ""}${drift.driftPercent.toFixed(1)} pp).`,
          severity: "warning",
          category: "allocation",
          metricLabel: "Poikkeama",
          metricValue: `${drift.driftPercent >= 0 ? "+" : ""}${drift.driftPercent.toFixed(1)} pp`,
          priority: 75,
        })
      );
    }

    if (onTarget && allocationDrift.length >= 2) {
      insights.push(
        createInsight({
          id: "drift-on-target",
          title: "Allokaatio on lähellä tavoitettasi",
          description: "Kaikki seuratut kategoriat ovat tavoiteprosenttinsa sisällä (±5 pp).",
          severity: "positive",
          category: "allocation",
          priority: 48,
        })
      );
    }
  }

  // ── Contribution plan insights ────────────────────────────────────────────────
  if (contributionPlan?.hasTargets && contributionPlan.primaryFocus) {
    const focus = contributionPlan.primaryFocus;
    if (Math.abs(focus.driftPercent) >= 5) {
      insights.push(
        createInsight({
          id: "contribution-plan-focus",
          title: "Kuukausisäästö voi korjata alipainoa",
          description: `Seuraava talletus (${formatCurrency(contributionPlan.contributionAmount, { currency: portfolio.baseCurrency })}) voi auttaa korjaamaan ${focus.label}-alipainoa (${Math.abs(focus.driftPercent).toFixed(1)} pp). Tarkista ennen päätöksiä.`,
          severity: "neutral",
          category: "allocation",
          metricLabel: "Kohdekategoria",
          metricValue: focus.label,
          priority: 17,
        })
      );
    }
  }

  // ── History-based insights ────────────────────────────────────────────────────
  if (historySummary?.hasHistory) {
    const { periodMonths, totalDividends, totalDeposits, totalFees } = historySummary;

    if (periodMonths >= 6) {
      insights.push(
        createInsight({
          id: "history-long-track",
          title: "Salkulla on yli 6 kuukauden historia",
          description: `Transaktiohistoria kattaa ${periodMonths} kuukautta, mikä mahdollistaa pidempiaikaisen seurannan.`,
          severity: "positive",
          category: "performance",
          metricLabel: "Historia",
          metricValue: `${periodMonths} kk`,
          priority: 46,
        })
      );
    }

    if (totalDeposits > 0 && totalDividends / totalDeposits >= 0.02) {
      insights.push(
        createInsight({
          id: "history-dividend-income",
          title: "Osinkotuotto on merkittävä",
          description: `Kirjatut osingot ovat vähintään 2 % kokonaistalletuksista — ${formatCurrency(totalDividends, { currency: portfolio.baseCurrency })}.`,
          severity: "positive",
          category: "performance",
          metricLabel: "Osingot",
          metricValue: formatCurrency(totalDividends, { currency: portfolio.baseCurrency }),
          priority: 43,
        })
      );
    }

    if (totalDeposits > 0 && totalFees / totalDeposits >= 0.01) {
      insights.push(
        createInsight({
          id: "history-high-fees",
          title: "Kulut ovat korkeat suhteessa talletuksiin",
          description: `Kirjatut kulut ylittävät 1 % kokonaistalletuksista — ${formatCurrency(totalFees, { currency: portfolio.baseCurrency })}.`,
          severity: "warning",
          category: "performance",
          metricLabel: "Kulut",
          metricValue: formatCurrency(totalFees, { currency: portfolio.baseCurrency }),
          priority: 67,
        })
      );
    }
  }

  // ── Performance-based insights (only when transaction history exists) ────────
  if (performance?.hasTransactions) {
    const { simpleReturnPercent, totalFees, totalDeposits } = performance;

    if (simpleReturnPercent !== null && simpleReturnPercent >= 10) {
      insights.push(
        createInsight({
          id: "performance-positive-return",
          title: "Salkun tuotto on vahvasti positiivinen",
          description: "Transaktiohistorian perusteella yksinkertainen tuotto on selkeästi plussan puolella.",
          severity: "positive",
          category: "performance",
          metricLabel: "Tuotto",
          metricValue: `+${simpleReturnPercent.toFixed(1)} %`,
          priority: 55,
        })
      );
    } else if (simpleReturnPercent !== null && simpleReturnPercent < -10) {
      insights.push(
        createInsight({
          id: "performance-negative-return",
          title: "Salkun tuotto on selkeästi negatiivinen",
          description: "Transaktiohistorian perusteella yksinkertainen tuotto on miinuksella suhteessa talletuksiin.",
          severity: "warning",
          category: "performance",
          metricLabel: "Tuotto",
          metricValue: `${simpleReturnPercent.toFixed(1)} %`,
          priority: 78,
        })
      );
    }

    if (totalDeposits > 0 && (totalFees / totalDeposits) > 0.005) {
      insights.push(
        createInsight({
          id: "performance-high-fees",
          title: "Kulut ovat merkittävät suhteessa talletuksiin",
          description: `Kirjatut kulut (${formatCurrency(totalFees, { currency: portfolio.baseCurrency })}) ovat yli 0,5 % kokonaistalletuksista.`,
          severity: "warning",
          category: "performance",
          metricLabel: "Kulut",
          metricValue: formatCurrency(totalFees, { currency: portfolio.baseCurrency }),
          priority: 65,
        })
      );
    }
  } else if (performance && !performance.hasTransactions) {
    insights.push(
      createInsight({
        id: "no-transaction-history",
        title: "Transaktiohistoria puuttuu",
        description: "Lisää ostot, myynnit ja talletukset tarkempaa tuottoanalyysiä varten.",
        severity: "neutral",
        category: "performance",
        priority: 14,
      })
    );
  }

  if (insights.length === 0) {
    insights.push(
      createInsight({
        id: "portfolio-balanced-baseline",
        title: "Ei selkeitä varoituksia",
        description: "Nykyisestä dashboard-datasta ei nouse kriittisiä tai varoittavia portfoliohavaintoja.",
        severity: "neutral",
        category: "risk",
        priority: 10,
      })
    );
  }

  return sortPortfolioInsights(insights);
}
