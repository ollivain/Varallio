import type { Layout, ResponsiveLayouts } from "react-grid-layout";

type Layouts = ResponsiveLayouts<DashboardBreakpoint>;

export const DASHBOARD_LAYOUT_STORAGE_KEY = "investment-os:dashboard-layout";

export const DASHBOARD_BREAKPOINTS = {
  lg: 1024,
  md: 768,
  sm: 0,
};

export const DASHBOARD_COLS = {
  lg: 12,
  md: 8,
  sm: 1,
};

export type DashboardBreakpoint = keyof typeof DASHBOARD_COLS;

export type DashboardWidgetId =
  | "today-brief"
  | "onboarding"
  | "portfolio-value"
  | "day-change"
  | "total-return"
  | "performance"
  | "cashflow"
  | "insights"
  | "actions"
  | "data-status"
  | "company-snapshot"
  | "watchlist-research"
  | "allocation-targets"
  | "allocation"
  | "rebalance"
  | "scenario"
  | "watchlist"
  | "transactions"
  | "news"
  | "alerts";

export const DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = [
  "today-brief",
  "onboarding",
  "portfolio-value",
  "day-change",
  "total-return",
  "performance",
  "cashflow",
  "insights",
  "actions",
  "data-status",
  "company-snapshot",
  "watchlist-research",
  "allocation-targets",
  "allocation",
  "rebalance",
  "scenario",
  "watchlist",
  "transactions",
  "news",
  "alerts",
];

const lg: Layout = [
  { i: "today-brief", x: 0, y: 0, w: 12, h: 5, minW: 6, minH: 4 },
  { i: "onboarding", x: 0, y: 5, w: 12, h: 4, minW: 6, minH: 3 },
  { i: "portfolio-value", x: 0, y: 9, w: 4, h: 3, minW: 3, minH: 2 },
  { i: "day-change", x: 4, y: 9, w: 4, h: 3, minW: 3, minH: 2 },
  { i: "total-return", x: 8, y: 9, w: 4, h: 3, minW: 3, minH: 2 },
  { i: "performance", x: 0, y: 12, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "cashflow", x: 6, y: 12, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "insights", x: 0, y: 17, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "actions", x: 6, y: 17, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "data-status", x: 0, y: 23, w: 12, h: 4, minW: 6, minH: 3 },
  { i: "company-snapshot", x: 0, y: 27, w: 12, h: 6, minW: 6, minH: 4 },
  { i: "watchlist-research", x: 0, y: 33, w: 12, h: 7, minW: 6, minH: 5 },
  { i: "allocation-targets", x: 0, y: 40, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "allocation", x: 6, y: 40, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "rebalance", x: 0, y: 46, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "scenario", x: 6, y: 46, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "watchlist", x: 0, y: 52, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "transactions", x: 6, y: 52, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "news", x: 0, y: 58, w: 6, h: 6, minW: 4, minH: 4 },
  { i: "alerts", x: 6, y: 58, w: 6, h: 6, minW: 4, minH: 4 },
];

const md: Layout = [
  { i: "today-brief", x: 0, y: 0, w: 8, h: 5, minW: 4, minH: 4 },
  { i: "onboarding", x: 0, y: 5, w: 8, h: 4, minW: 4, minH: 3 },
  { i: "portfolio-value", x: 0, y: 9, w: 3, h: 3, minW: 2, minH: 2 },
  { i: "day-change", x: 3, y: 9, w: 3, h: 3, minW: 2, minH: 2 },
  { i: "total-return", x: 6, y: 9, w: 2, h: 3, minW: 2, minH: 2 },
  { i: "performance", x: 0, y: 12, w: 4, h: 5, minW: 3, minH: 4 },
  { i: "cashflow", x: 4, y: 12, w: 4, h: 5, minW: 3, minH: 4 },
  { i: "insights", x: 0, y: 17, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "actions", x: 4, y: 17, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "data-status", x: 0, y: 23, w: 8, h: 4, minW: 4, minH: 3 },
  { i: "company-snapshot", x: 0, y: 27, w: 8, h: 6, minW: 4, minH: 4 },
  { i: "watchlist-research", x: 0, y: 33, w: 8, h: 7, minW: 4, minH: 5 },
  { i: "allocation-targets", x: 0, y: 40, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "allocation", x: 4, y: 40, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "rebalance", x: 0, y: 46, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "scenario", x: 4, y: 46, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "watchlist", x: 0, y: 52, w: 4, h: 5, minW: 3, minH: 4 },
  { i: "transactions", x: 4, y: 52, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "news", x: 0, y: 58, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "alerts", x: 4, y: 58, w: 4, h: 6, minW: 3, minH: 4 },
];

const sm: Layout = DASHBOARD_WIDGET_IDS.map((id, index) => {
  const source = lg.find((item) => item.i === id);

  return {
    i: id,
    x: 0,
    y: index * 6,
    w: 1,
    h: Math.max(3, source?.h ?? 4),
    minW: 1,
    minH: 2,
  };
});

export const defaultDashboardLayouts: Layouts = { lg, md, sm };
