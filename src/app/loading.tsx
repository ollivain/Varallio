export default function LoadingPage() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "#050817" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{
            borderColor: "rgba(139,92,246,0.2)",
            borderTopColor: "rgba(139,92,246,0.8)",
          }}
        />
        <p
          className="text-[11px]"
          style={{ color: "rgba(148,163,184,0.45)" }}
        >
          Ladataan…
        </p>
      </div>
    </div>
  );
}
