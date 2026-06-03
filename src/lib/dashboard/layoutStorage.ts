import type { Layout, ResponsiveLayouts } from "react-grid-layout";
import {
  DASHBOARD_BREAKPOINTS,
  DASHBOARD_LAYOUT_STORAGE_KEY,
  DASHBOARD_WIDGET_IDS,
  defaultDashboardLayouts,
  type DashboardBreakpoint,
} from "./defaultLayout";

type Layouts = ResponsiveLayouts<DashboardBreakpoint>;

const breakpointKeys = Object.keys(DASHBOARD_BREAKPOINTS) as DashboardBreakpoint[];

function cloneLayouts(layouts: Layouts): Layouts {
  return Object.fromEntries(
    breakpointKeys.map((breakpoint) => [
      breakpoint,
      (layouts[breakpoint] ?? []).map((item) => ({ ...item })),
    ])
  );
}

function hasKnownWidgets(layout: Layout) {
  const ids = new Set(DASHBOARD_WIDGET_IDS);

  return layout.every((item) => ids.has(item.i as (typeof DASHBOARD_WIDGET_IDS)[number]));
}

function normalizeLayout(layout: Layout, fallback: Layout) {
  const byId = new Map(layout.map((item) => [item.i, item]));
  const normalized = fallback.map((fallbackItem) => ({
    ...fallbackItem,
    ...(byId.get(fallbackItem.i) ?? {}),
  }));

  return hasKnownWidgets(normalized) ? normalized : fallback;
}

export function getDefaultDashboardLayouts(): Layouts {
  return cloneLayouts(defaultDashboardLayouts);
}

export function readDashboardLayouts(): Layouts {
  if (typeof window === "undefined") return getDefaultDashboardLayouts();

  try {
    const stored = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!stored) return getDefaultDashboardLayouts();

    const parsed = JSON.parse(stored) as Layouts;

    return Object.fromEntries(
      breakpointKeys.map((breakpoint) => [
        breakpoint,
        normalizeLayout(parsed[breakpoint] ?? [], defaultDashboardLayouts[breakpoint] ?? []),
      ])
    );
  } catch {
    return getDefaultDashboardLayouts();
  }
}

export function writeDashboardLayouts(layouts: Layouts) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
}

export function resetDashboardLayouts() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DASHBOARD_LAYOUT_STORAGE_KEY);
  }

  return getDefaultDashboardLayouts();
}
