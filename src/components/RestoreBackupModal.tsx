"use client";

import { useRef, useState } from "react";
import { parseBackup, summarizeBackup } from "@/lib/backup";
import type { BackupData, BackupSummary, InvestmentOSBackup } from "@/lib/backup";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatExportedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fi-FI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Preview row ────────────────────────────────────────────────────────────────

function PreviewRow({ label, value }: { label: string; value: string | number | boolean }) {
  const displayValue =
    typeof value === "boolean" ? (value ? "Kyllä" : "Ei") : String(value);
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.65)" }}>
        {label}
      </p>
      <p className="text-[11px] font-semibold tabular-nums text-white">{displayValue}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RestoreBackupModal({
  isOpen,
  onClose,
  onRestore,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (data: BackupData) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<InvestmentOSBackup | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);

  if (!isOpen) return null;

  function reset() {
    setParseError(null);
    setParsedBackup(null);
    setSummary(null);
    setConfirmed(false);
    setRestoreDone(false);
  }

  function handleClose() {
    reset();
    setPasteText("");
    onClose();
  }

  function applyParsed(text: string) {
    reset();
    if (!text.trim()) return;
    const result = parseBackup(text);
    if (!result.ok) {
      setParseError(result.error);
      return;
    }
    setParsedBackup(result.backup);
    setSummary(summarizeBackup(result.backup));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setPasteText(text);
        applyParsed(text);
      }
    };
    reader.readAsText(file, "utf-8");
    // Reset file input so same file can be re-selected
    e.target.value = "";
  }

  function handlePasteCheck() {
    applyParsed(pasteText);
  }

  function handleRestore() {
    if (!parsedBackup || !confirmed) return;
    onRestore(parsedBackup.data);
    setRestoreDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(10px)" }}
        onClick={handleClose}
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(18,21,31,0.99), rgba(8,13,25,0.99))",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.52)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Palauta backup</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.6)" }}>
              Palauttaa koko sovelluksen datan backup-tiedostosta.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
            style={{ color: "rgba(203,213,225,0.75)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">

          {restoreDone ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(134,239,172,0.12)", border: "1px solid rgba(134,239,172,0.2)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">Backup palautettu</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.65)" }}>
                Data on ladattu muistiin. Sulje tämä ikkuna.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  color: "rgba(196,181,253,0.9)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                Sulje
              </button>
            </div>
          ) : (
            <>
              {/* ── Step 1: Load file ── */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                  1. Valitse backup-tiedosto
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-white/[0.05]"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "rgba(196,181,253,0.88)",
                    border: "1px solid rgba(139,92,246,0.16)",
                  }}
                >
                  Valitse JSON-tiedosto
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.38)" }}>tai</p>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='Liitä backup-JSON tähän...'
                  rows={4}
                  className="w-full rounded-lg px-3 py-2 text-[10px] font-mono text-white outline-none focus:ring-1 focus:ring-violet-500/40 resize-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(148,163,184,0.1)",
                    color: "rgba(203,213,225,0.82)",
                  }}
                />
                <button
                  type="button"
                  onClick={handlePasteCheck}
                  disabled={!pasteText.trim()}
                  className="self-start rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(255,255,255,0.028)",
                    color: "rgba(203,213,225,0.8)",
                    border: "1px solid rgba(148,163,184,0.1)",
                  }}
                >
                  Tarkista JSON
                </button>
              </div>

              {/* ── Parse error ── */}
              {parseError && (
                <div
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    background: "rgba(248,113,113,0.07)",
                    border: "1px solid rgba(248,113,113,0.12)",
                  }}
                >
                  <p className="text-[11px] font-semibold" style={{ color: "rgba(254,202,202,0.88)" }}>
                    Virhe
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(254,202,202,0.72)" }}>
                    {parseError}
                  </p>
                </div>
              )}

              {/* ── Step 2: Preview ── */}
              {summary && parsedBackup && (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                    2. Esikatselu
                  </p>
                  <div
                    className="rounded-xl px-3 divide-y"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderColor: "rgba(148,163,184,0.08)",
                    }}
                  >
                    <PreviewRow label="Viety" value={formatExportedAt(summary.exportedAt)} />
                    <PreviewRow label="Versio" value={summary.version} />
                    <PreviewRow label="Omistuksia" value={summary.holdingsCount} />
                    <PreviewRow label="Käteistilejä" value={summary.cashCount} />
                    <PreviewRow label="Watchlist-kohteita" value={summary.watchlistCount} />
                    <PreviewRow label="Hälytyksiä" value={summary.alertsCount} />
                    <PreviewRow label="Uutisia" value={summary.newsCount} />
                    <PreviewRow label="Transaktioita" value={summary.transactionsCount} />
                    <PreviewRow label="Tavoitteet asetettu" value={summary.hasGoals} />
                    <PreviewRow label="FX-lähde" value={summary.fxSource} />
                  </div>

                  {/* Warning */}
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      background: "rgba(251,191,36,0.07)",
                      border: "1px solid rgba(251,191,36,0.12)",
                    }}
                  >
                    <p className="text-[11px] font-semibold" style={{ color: "rgba(253,230,138,0.88)" }}>
                      ⚠ Palautus korvaa nykyisen paikallisen datan.
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "rgba(253,230,138,0.65)" }}>
                      Kaikki nykyinen portfolio, watchlist, transaktiot ja muut tiedot korvataan backup-datalla. Toimintoa ei voi peruuttaa.
                    </p>
                  </div>

                  {/* ── Step 3: Confirm + Restore ── */}
                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                      3. Vahvista
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-0.5 accent-violet-500"
                      />
                      <span className="text-[11px] leading-relaxed" style={{ color: "rgba(203,213,225,0.7)" }}>
                        Ymmärrän, että nykyinen data korvataan eikä toimintoa voi peruuttaa.
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRestore}
                      disabled={!confirmed}
                      className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: confirmed ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.025)",
                        color: confirmed ? "rgba(254,202,202,0.9)" : "rgba(148,163,184,0.5)",
                        border: confirmed ? "1px solid rgba(248,113,113,0.18)" : "1px solid rgba(148,163,184,0.1)",
                      }}
                    >
                      Palauta backup
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
