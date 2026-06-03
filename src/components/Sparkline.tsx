"use client";

const POINTS = [60, 55, 62, 58, 70, 65, 72, 68, 75, 80, 77, 85];

export default function Sparkline({ color = "#22c55e" }: { color?: string }) {
  const w = 80;
  const h = 28;
  const min = Math.min(...POINTS);
  const max = Math.max(...POINTS);
  const range = max - min || 1;

  const toX = (i: number) => (i / (POINTS.length - 1)) * w;
  const toY = (v: number) => h - ((v - min) / range) * h;

  const d = POINTS.map((v, i) =>
    `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`
  ).join(" ");

  const fillD = `${d} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#sparkFill)" />
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
