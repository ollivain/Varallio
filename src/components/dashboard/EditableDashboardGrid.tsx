"use client";

import type { ReactNode, Ref } from "react";
import { useEffect, useState } from "react";
import {
  Responsive,
  useContainerWidth,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout";
import DashboardWidget from "./DashboardWidget";
import {
  DASHBOARD_BREAKPOINTS,
  DASHBOARD_COLS,
  type DashboardBreakpoint,
  type DashboardWidgetId,
} from "@/lib/dashboard/defaultLayout";
import {
  getDefaultDashboardLayouts,
  readDashboardLayouts,
  resetDashboardLayouts,
  writeDashboardLayouts,
} from "@/lib/dashboard/layoutStorage";

type Layouts = ResponsiveLayouts<DashboardBreakpoint>;

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  content: ReactNode;
}

export default function EditableDashboardGrid({
  isEditing,
  widgets,
}: {
  isEditing: boolean;
  widgets: DashboardWidgetConfig[];
}) {
  const [layouts, setLayouts] = useState<Layouts>(() => getDefaultDashboardLayouts());
  const [isHydrated, setIsHydrated] = useState(false);
  const [breakpoint, setBreakpoint] = useState<DashboardBreakpoint>("lg");
  const { containerRef, mounted, width } = useContainerWidth({ initialWidth: 1024 });

  useEffect(() => {
    setLayouts(readDashboardLayouts());
    setIsHydrated(true);
  }, []);

  function handleLayoutChange(_currentLayout: Layout, allLayouts: Layouts) {
    setLayouts(allLayouts);

    if (isHydrated) {
      writeDashboardLayouts(allLayouts);
    }
  }

  function handleResetLayout() {
    setLayouts(resetDashboardLayouts());
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isEditing && (
          <button
            type="button"
            onClick={handleResetLayout}
            className="rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
            style={{
              background: "rgba(255,255,255,0.032)",
              color: "rgba(203,213,225,0.75)",
              border: "1px solid rgba(148,163,184,0.09)",
            }}
          >
            Palauta oletusnäkymä
          </button>
        )}
      </div>

      <div ref={containerRef as Ref<HTMLDivElement>}>
        {mounted && (
          <Responsive
            className={isEditing ? "dashboard-edit-grid is-editing" : "dashboard-edit-grid"}
            breakpoints={DASHBOARD_BREAKPOINTS}
            cols={DASHBOARD_COLS}
            dragConfig={{
              cancel: "button, a, input, select, textarea, [role='button']",
              enabled: isEditing,
            }}
            layouts={layouts}
            margin={[12, 12]}
            onBreakpointChange={(nextBreakpoint) => setBreakpoint(nextBreakpoint)}
            onLayoutChange={handleLayoutChange}
            resizeConfig={{
              enabled: isEditing && breakpoint !== "sm",
              handles: ["se"],
            }}
            rowHeight={56}
            width={width}
          >
            {widgets.map((widget) => (
              <div key={widget.id} data-grid={{ i: widget.id }}>
                <DashboardWidget isEditing={isEditing}>{widget.content}</DashboardWidget>
              </div>
            ))}
          </Responsive>
        )}
      </div>
    </section>
  );
}
