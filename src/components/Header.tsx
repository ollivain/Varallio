const tickers = [
  { label: "OMXH25", value: "+0,58%", positive: true },
  { label: "S&P 500", value: "+0,32%", positive: true },
  { label: "NASDAQ", value: "+0,41%", positive: true },
  { label: "EUR/USD", value: "-0,12%", positive: false },
  { label: "Öljy", value: "+0,27%", positive: true },
];

export default function Header() {
  return (
    <header
      className="flex items-center shrink-0 px-4 gap-5"
      style={{
        height: 52,
        background: "#07091a",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Brand */}
      <span className="text-sm font-semibold text-white whitespace-nowrap tracking-wide">
        Investment OS
      </span>

      {/* Divider */}
      <span className="w-px h-4 shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} />

      {/* Market tickers */}
      <div className="flex items-center gap-5 overflow-x-auto flex-1 min-w-0">
        {tickers.map((t) => (
          <div key={t.label} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-medium" style={{ color: "rgba(148,163,184,0.7)" }}>
              {t.label}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: t.positive ? "#4ade80" : "#f87171" }}
            >
              {t.value}
            </span>
          </div>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: "rgba(148,163,184,0.55)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-[15px] h-[15px]" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>

        <button
          className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: "rgba(148,163,184,0.55)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-[15px] h-[15px]" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="absolute top-[7px] right-[7px] w-[5px] h-[5px] rounded-full"
            style={{ background: "#8b5cf6" }} />
        </button>

        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ml-1 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          M
        </div>
      </div>
    </header>
  );
}
