import type { PortfolioGoalSettings } from "./types";

/**
 * Sensible demo defaults that roughly match the mock portfolio composition.
 * Used when no saved goal settings exist in localStorage.
 */
export const defaultGoalSettings: PortfolioGoalSettings = {
  monthlyContributionTarget: 1000,
  allocationTargets: [
    {
      id: "target-stock",
      label: "Osakkeet",
      category: "assetType",
      key: "stock",
      targetPercent: 70,
    },
    {
      id: "target-etf",
      label: "ETF:t",
      category: "assetType",
      key: "etf",
      targetPercent: 12,
    },
    {
      id: "target-cash",
      label: "Käteinen",
      category: "cash",
      key: "cash",
      targetPercent: 8,
    },
    {
      id: "target-commodity",
      label: "Raaka-aineet",
      category: "assetType",
      key: "commodity",
      targetPercent: 10,
    },
  ],
};
