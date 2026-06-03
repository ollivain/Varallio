import Sparkline from "./Sparkline";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  showSparkline?: boolean;
}

export default function MetricCard({ title, value, change, positive, showSparkline }: MetricCardProps) {
  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
        {title}
      </p>
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-2xl font-bold text-white leading-none tracking-tight">{value}</span>
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-semibold"
              style={{ color: positive ? "#4ade80" : "#f87171" }}
            >
              {change}
            </span>
          </div>
        </div>
        {showSparkline && (
          <div className="pb-0.5">
            <Sparkline color={positive ? "#4ade80" : "#f87171"} />
          </div>
        )}
      </div>
    </div>
  );
}
