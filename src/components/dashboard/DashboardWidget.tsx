import type { ReactNode } from "react";

export default function DashboardWidget({
  children,
  isEditing,
}: {
  children: ReactNode;
  isEditing: boolean;
}) {
  return (
    <div className="dashboard-widget h-full min-h-0">
      <div
        className={[
          "dashboard-widget-content h-full min-h-0 overflow-auto rounded-xl transition-all",
          isEditing ? "dashboard-widget-content-editing" : "",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
