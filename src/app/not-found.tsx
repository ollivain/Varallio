import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "#050817" }}
    >
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(148,163,184,0.45)" }}
        >
          404
        </p>
        <p className="text-sm font-semibold text-white">Sivua ei löydy</p>
        <p className="text-[12px] leading-relaxed" style={{ color: "rgba(148,163,184,0.6)" }}>
          Etsimääsi sivua ei ole olemassa.
        </p>
        <Link
          href="/"
          className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.08]"
          style={{
            background: "rgba(99,102,241,0.12)",
            color: "rgba(196,181,253,0.9)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          Takaisin dashboardiin
        </Link>
      </div>
    </div>
  );
}
