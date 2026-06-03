"use client";

import { useEffect, useRef, useState } from "react";
import {
  CSV_HEADER,
  MAX_CSV_BYTES,
  generateCSVTemplate,
  parseCSV,
  parseNordnetCSV,
  type ImportedTransactionRow,
  type TransactionImportError,
  type TransactionImportResult,
} from "@/lib/transactions";
import type { Transaction } from "@/lib/transactions";
import type { TransactionType } from "@/lib/transactions";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportSource = "investment_os" | "nordnet";

const TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Osto",
  sell: "Myynti",
  deposit: "Talletus",
  withdrawal: "Nosto",
  dividend: "Osinko",
  fee: "Kulu",
};

const PREVIEW_VALID_LIMIT = 5;
const PREVIEW_ERROR_LIMIT = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDate(date: string): string {
  try {
    return new Intl.DateTimeFormat("fi-FI", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ValidRowPreview({ row }: { row: ImportedTransactionRow }) {
  const tx = row.transaction;
  const label = TYPE_LABELS[tx.type];
  const details = [
    tx.symbol,
    tx.quantity !== undefined && tx.price !== undefined
      ? `${tx.quantity} × ${tx.price}`
      : undefined,
    `${tx.amount} ${tx.currency}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2 min-w-0"
      style={{
        background: "rgba(74,222,128,0.06)",
        border: "1px solid rgba(74,222,128,0.1)",
      }}
    >
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shrink-0"
        style={{ background: "rgba(74,222,128,0.12)", color: "rgba(134,239,172,0.85)" }}
      >
        {label}
      </span>
      <p className="text-[10px] flex-1 min-w-0 truncate" style={{ color: "rgba(203,213,225,0.8)" }}>
        {details}
      </p>
      <p className="text-[9px] shrink-0" style={{ color: "rgba(148,163,184,0.5)" }}>
        {formatDate(tx.date)}
      </p>
    </div>
  );
}

function ErrorRowPreview({ error }: { error: TransactionImportError }) {
  return (
    <div
      className="flex gap-2 rounded-lg px-3 py-2 min-w-0"
      style={{
        background: "rgba(248,113,113,0.06)",
        border: "1px solid rgba(248,113,113,0.1)",
      }}
    >
      <span
        className="text-[9px] font-semibold shrink-0 mt-0.5"
        style={{ color: "rgba(252,165,165,0.6)" }}
      >
        rivi {error.lineNumber}
      </span>
      <p className="text-[10px] min-w-0 break-words" style={{ color: "rgba(252,165,165,0.82)" }}>
        {error.reason}
      </p>
    </div>
  );
}

// ── Source selector ────────────────────────────────────────────────────────────

function SourceSelector({
  selected,
  onChange,
}: {
  selected: ImportSource;
  onChange: (s: ImportSource) => void;
}) {
  const sources: { value: ImportSource; label: string }[] = [
    { value: "investment_os", label: "Investment OS CSV" },
    { value: "nordnet", label: "Nordnet CSV" },
  ];
  return (
    <div
      className="flex rounded-xl p-1 gap-1"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(148,163,184,0.08)" }}
    >
      {sources.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(s.value)}
          className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: selected === s.value ? "rgba(99,102,241,0.18)" : "transparent",
            color:
              selected === s.value ? "rgba(196,181,253,0.95)" : "rgba(148,163,184,0.6)",
            border:
              selected === s.value
                ? "1px solid rgba(139,92,246,0.22)"
                : "1px solid transparent",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── Format help card ──────────────────────────────────────────────────────────

function FormatHelpCard({
  source,
  onDownloadTemplate,
}: {
  source: ImportSource;
  onDownloadTemplate: () => void;
}) {
  if (source === "nordnet") {
    return (
      <div
        className="rounded-xl px-3 py-3 flex flex-col gap-1.5"
        style={{
          background: "rgba(255,255,255,0.022)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <p className="text-[10px] font-semibold text-white">Nordnet CSV</p>
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(148,163,184,0.6)" }}>
          Lataa tapahtumat CSV:nä Nordnetistä (Tapahtumat → Vie CSV) ja tuo tiedosto tähän.
          Tuetut sarake-erottimet: sarkain, puolipiste, pilkku. Tuetut kielet: suomi, englanti.
        </p>
        <p className="text-[10px] leading-relaxed" style={{ color: "rgba(148,163,184,0.5)" }}>
          Jos sarakkeet eivät tunnistu, tarkista että tiedosto on Nordnetin oma export-muoto.
          Voit myös käyttää Investment OS CSV -mallia manuaaliseen syöttöön.
        </p>
        <p className="text-[10px]" style={{ color: "rgba(251,191,36,0.65)" }}>
          Kokeellinen tuki — tarkista preview ennen tuontia.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-3 py-3 flex flex-col gap-1.5"
      style={{
        background: "rgba(255,255,255,0.022)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[10px] font-semibold text-white">Odotettu CSV-muoto</p>
          <p
            className="text-[9px] font-mono break-all"
            style={{ color: "rgba(148,163,184,0.55)" }}
          >
            {CSV_HEADER}
          </p>
          <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>
            Päivämäärä: YYYY-MM-DD · Valuutat: EUR, USD, SEK, NOK, GBP
          </p>
        </div>
        <button
          type="button"
          onClick={onDownloadTemplate}
          className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold shrink-0 transition-colors hover:bg-white/[0.06]"
          style={{
            background: "rgba(255,255,255,0.04)",
            color: "rgba(148,163,184,0.75)",
            border: "1px solid rgba(148,163,184,0.1)",
          }}
        >
          Lataa malli
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type ModalState = "idle" | "previewing" | "done";

export default function ImportTransactionsModal({
  existingTransactions,
  isOpen,
  onClose,
  onImport,
}: {
  existingTransactions: Transaction[];
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: Omit<Transaction, "id" | "createdAt">[]) => void;
}) {
  const [importSource, setImportSource] = useState<ImportSource>("investment_os");
  const [state, setState] = useState<ModalState>("idle");
  const [csvText, setCsvText] = useState("");
  const [parseResult, setParseResult] = useState<TransactionImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setState("idle");
      setCsvText("");
      setParseResult(null);
      setFileError(null);
      setImportedCount(0);
      setImportSource("investment_os");
    }
  }, [isOpen]);

  // Reset parse result when source changes
  function handleSourceChange(source: ImportSource) {
    setImportSource(source);
    setParseResult(null);
    setState("idle");
    setFileError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    setParseResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CSV_BYTES) {
      setFileError(
        `Tiedosto on liian suuri (${(file.size / 1024).toFixed(0)} KB). Raja on 1 MB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setCsvText(text);
      runParse(text);
    };
    reader.onerror = () => {
      setFileError("Tiedoston lukeminen epäonnistui.");
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function runParse(text: string) {
    if (!text.trim()) {
      setParseResult(null);
      setState("idle");
      return;
    }
    const result =
      importSource === "nordnet"
        ? parseNordnetCSV(text, existingTransactions)
        : parseCSV(text, existingTransactions);
    setParseResult(result);
    setState("previewing");
  }

  function handleTextareaChange(value: string) {
    setCsvText(value);
    if (parseResult) {
      setParseResult(null);
      setState("idle");
    }
  }

  function handleImport() {
    if (!parseResult || parseResult.validRows.length === 0) return;
    onImport(parseResult.validRows.map((r) => r.transaction));
    setImportedCount(parseResult.validRows.length);
    setState("done");
  }

  function handleDownloadTemplate() {
    downloadText("investment-os-transactions-template.csv", generateCSVTemplate());
  }

  if (!isOpen) return null;

  const canImport = state === "previewing" && (parseResult?.validRows.length ?? 0) > 0;
  const placeholder =
    importSource === "nordnet"
      ? "Päivä\tTapahtumatyyppi\tArvopaperi\tMäärä\tKurssi\tSumma\tValuutta\n2026-01-05\tOsto\tNVIDIA Corp\t2\t900\t-1800\tEUR"
      : `${CSV_HEADER}\ndeposit,,,,,5000,EUR,2026-01-01,Alkupääoma\nbuy,NVDA,NVIDIA,2,900,1800,EUR,2026-01-05,`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(18,21,31,0.98), rgba(8,13,25,0.98))",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.5)",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Tuo transaktiot CSV:stä</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
              Valitse lähde, tiedosto tai liitä CSV-teksti.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]"
            style={{ color: "rgba(203,213,225,0.75)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Success state */}
          {state === "done" ? (
            <div
              className="rounded-xl px-4 py-4 flex flex-col gap-2 items-center text-center"
              style={{
                background: "rgba(74,222,128,0.07)",
                border: "1px solid rgba(74,222,128,0.14)",
              }}
            >
              <p className="text-sm font-semibold text-white">
                {importedCount} transaktiota tuotu!
              </p>
              <p className="text-[11px]" style={{ color: "rgba(134,239,172,0.72)" }}>
                Transaktiot on lisätty ja performance päivitetty.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
                style={{
                  background: "rgba(74,222,128,0.1)",
                  color: "rgba(134,239,172,0.9)",
                  border: "1px solid rgba(74,222,128,0.15)",
                }}
              >
                Sulje
              </button>
            </div>
          ) : (
            <>
              {/* Source selector */}
              <SourceSelector selected={importSource} onChange={handleSourceChange} />

              {/* Format help */}
              <FormatHelpCard source={importSource} onDownloadTemplate={handleDownloadTemplate} />

              {/* File input */}
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(148,163,184,0.5)" }}
                >
                  Valitse CSV-tiedosto
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/[0.06]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(203,213,225,0.75)",
                      border: "1px solid rgba(148,163,184,0.1)",
                    }}
                  >
                    Valitse tiedosto…
                  </label>
                </div>
                {fileError && (
                  <p className="text-[11px]" style={{ color: "rgba(252,165,165,0.85)" }}>
                    {fileError}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                  tai liitä tekstinä
                </p>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Textarea */}
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "rgba(148,163,184,0.5)" }}
                >
                  Liitä CSV-teksti
                </span>
                <textarea
                  value={csvText}
                  onChange={(e) => handleTextareaChange(e.target.value)}
                  rows={5}
                  placeholder={placeholder}
                  className="rounded-lg px-3 py-2 text-[10px] font-mono text-white outline-none focus:ring-1 focus:ring-violet-500/40 resize-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(148,163,184,0.12)",
                    color: "rgba(203,213,225,0.85)",
                    lineHeight: 1.6,
                  }}
                />
                {csvText.trim() && !parseResult && (
                  <button
                    type="button"
                    onClick={() => runParse(csvText)}
                    className="self-start rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(148,163,184,0.75)",
                      border: "1px solid rgba(148,163,184,0.1)",
                    }}
                  >
                    Parsi CSV
                  </button>
                )}
              </div>

              {/* Preview */}
              {parseResult && (
                <div className="flex flex-col gap-3">
                  {/* Summary */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="rounded-md px-2.5 py-1 text-[10px] font-semibold"
                      style={{
                        background: parseResult.validRows.length > 0 ? "rgba(74,222,128,0.12)" : "rgba(148,163,184,0.08)",
                        color: parseResult.validRows.length > 0 ? "rgba(134,239,172,0.9)" : "rgba(148,163,184,0.6)",
                      }}
                    >
                      {parseResult.validRows.length} rivit valmis
                    </span>
                    {parseResult.errorRows.length > 0 && (
                      <span
                        className="rounded-md px-2.5 py-1 text-[10px] font-semibold"
                        style={{
                          background: "rgba(248,113,113,0.1)",
                          color: "rgba(252,165,165,0.85)",
                        }}
                      >
                        {parseResult.errorRows.length} virhettä
                      </span>
                    )}
                    {parseResult.duplicateCount > 0 && (
                      <span
                        className="rounded-md px-2.5 py-1 text-[10px] font-semibold"
                        style={{
                          background: "rgba(251,191,36,0.1)",
                          color: "rgba(253,230,138,0.8)",
                        }}
                      >
                        {parseResult.duplicateCount} duplikaattia ohitettu
                      </span>
                    )}
                  </div>

                  {/* Valid row preview */}
                  {parseResult.validRows.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: "rgba(148,163,184,0.45)" }}
                      >
                        Esikatselu — tuotavat rivit
                      </p>
                      {parseResult.validRows
                        .slice(0, PREVIEW_VALID_LIMIT)
                        .map((row) => (
                          <ValidRowPreview key={row.lineNumber} row={row} />
                        ))}
                      {parseResult.validRows.length > PREVIEW_VALID_LIMIT && (
                        <p
                          className="text-[10px] text-center"
                          style={{ color: "rgba(148,163,184,0.45)" }}
                        >
                          … ja {parseResult.validRows.length - PREVIEW_VALID_LIMIT} muuta riviä
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error rows */}
                  {parseResult.errorRows.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p
                        className="text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: "rgba(148,163,184,0.45)" }}
                      >
                        Virheelliset rivit (ohitetaan)
                      </p>
                      {parseResult.errorRows
                        .slice(0, PREVIEW_ERROR_LIMIT)
                        .map((err) => (
                          <ErrorRowPreview key={`${err.lineNumber}-${err.reason}`} error={err} />
                        ))}
                      {parseResult.errorRows.length > PREVIEW_ERROR_LIMIT && (
                        <p
                          className="text-[10px] text-center"
                          style={{ color: "rgba(252,165,165,0.5)" }}
                        >
                          … ja {parseResult.errorRows.length - PREVIEW_ERROR_LIMIT} muuta virhettä
                        </p>
                      )}
                    </div>
                  )}

                  {/* Zero valid rows warning */}
                  {parseResult.validRows.length === 0 && (
                    <div
                      className="rounded-xl px-3 py-2.5"
                      style={{
                        background: "rgba(251,191,36,0.07)",
                        border: "1px solid rgba(251,191,36,0.12)",
                      }}
                    >
                      <p className="text-[11px]" style={{ color: "rgba(253,230,138,0.82)" }}>
                        Ei tuotavia rivejä. Korjaa virheet tai vaihda lähde ja parsi uudelleen.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {state !== "done" && (
          <div
            className="flex gap-2 px-5 py-4 shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/[0.05]"
              style={{
                background: "rgba(255,255,255,0.025)",
                color: "rgba(203,213,225,0.7)",
              }}
            >
              Peruuta
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!canImport}
              className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "rgba(99,102,241,0.18)",
                color: "rgba(196,181,253,0.95)",
                border: "1px solid rgba(139,92,246,0.22)",
              }}
            >
              {canImport
                ? `Tuo ${parseResult!.validRows.length} transaktiota`
                : "Tuo transaktiot"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
