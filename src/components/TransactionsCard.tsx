"use client";

import { useState } from "react";
import type { Transaction, TransactionType } from "@/lib/transactions";
import { formatCurrency } from "@/lib/formatters";
import type { Currency } from "@/lib/portfolio/types";

const TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Osto",
  sell: "Myynti",
  deposit: "Talletus",
  withdrawal: "Nosto",
  dividend: "Osinko",
  fee: "Kulu",
};

const TYPE_COLORS: Record<TransactionType, { bg: string; color: string }> = {
  buy: { bg: "rgba(99,102,241,0.14)", color: "rgba(196,181,253,0.85)" },
  sell: { bg: "rgba(74,222,128,0.12)", color: "rgba(134,239,172,0.85)" },
  deposit: { bg: "rgba(56,189,248,0.12)", color: "rgba(125,211,252,0.85)" },
  withdrawal: { bg: "rgba(251,191,36,0.12)", color: "rgba(253,230,138,0.85)" },
  dividend: { bg: "rgba(74,222,128,0.1)", color: "rgba(134,239,172,0.75)" },
  fee: { bg: "rgba(248,113,113,0.1)", color: "rgba(252,165,165,0.75)" },
};

const PAGE_SIZE = 10;

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

function TypeBadge({ type }: { type: TransactionType }) {
  const { bg, color } = TYPE_COLORS[type];
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shrink-0"
      style={{ background: bg, color }}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export default function TransactionsCard({
  onAddTransaction,
  onEditTransaction,
  onImportCSV,
  onRemoveTransaction,
  transactions,
}: {
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onImportCSV: () => void;
  onRemoveTransaction: (id: string) => void;
  transactions: Transaction[];
}) {
  const [page, setPage] = useState(0);

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleRemove(id: string, label: string) {
    if (!window.confirm(`Poistetaanko transaktio "${label}"?`)) return;
    onRemoveTransaction(id);
  }

  return (
    <div className="glass-card px-4 py-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            Transaktiot
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            {transactions.length > 0
              ? `${transactions.length} merkintää`
              : "Ei transaktioita"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onImportCSV}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.05]"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(148,163,184,0.72)",
              border: "1px solid rgba(148,163,184,0.1)",
            }}
          >
            Tuo CSV
          </button>
          <button
            type="button"
            onClick={onAddTransaction}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/[0.06]"
            style={{
              background: "rgba(99,102,241,0.1)",
              color: "rgba(196,181,253,0.82)",
              border: "1px solid rgba(139,92,246,0.14)",
            }}
          >
            + Lisää
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div
          className="rounded-xl px-4 py-4 text-center"
          style={{
            background: "rgba(255,255,255,0.022)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <p className="text-xs font-medium text-white mb-1">
            Ei transaktioita vielä
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: "rgba(148,163,184,0.55)" }}
          >
            Lisää ensimmäinen transaktio yllä olevalla napilla.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {visible.map((tx) => {
              const label = `${TYPE_LABELS[tx.type]}${tx.symbol ? ` ${tx.symbol}` : ""}`;
              const txCurrency = tx.currency as Currency;
              return (
                <div
                  key={tx.id}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-3 min-w-0"
                  style={{
                    background: "rgba(255,255,255,0.022)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <TypeBadge type={tx.type} />

                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {tx.symbol && (
                        <p className="text-xs font-semibold text-white shrink-0">
                          {tx.symbol}
                        </p>
                      )}
                      {tx.name && (
                        <p
                          className="text-[10px] truncate"
                          style={{ color: "rgba(148,163,184,0.6)" }}
                        >
                          {tx.name}
                        </p>
                      )}
                      {!tx.symbol && !tx.name && (
                        <p
                          className="text-[10px]"
                          style={{ color: "rgba(148,163,184,0.6)" }}
                        >
                          {TYPE_LABELS[tx.type]}
                        </p>
                      )}
                    </div>
                    {tx.quantity && tx.price ? (
                      <p
                        className="text-[9px]"
                        style={{ color: "rgba(148,163,184,0.45)" }}
                      >
                        {tx.quantity} kpl × {tx.price} {tx.currency}
                      </p>
                    ) : tx.note ? (
                      <p
                        className="text-[9px] truncate"
                        style={{ color: "rgba(148,163,184,0.45)" }}
                      >
                        {tx.note}
                      </p>
                    ) : null}
                  </div>

                  <p
                    className="text-xs font-semibold tabular-nums shrink-0"
                    style={{ color: "rgba(203,213,225,0.82)" }}
                  >
                    {formatCurrency(tx.amount, { currency: txCurrency, decimals: 2 })}
                  </p>

                  <p
                    className="text-[9px] shrink-0 w-12 text-right"
                    style={{ color: "rgba(148,163,184,0.45)" }}
                  >
                    {formatDate(tx.date)}
                  </p>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/[0.07]"
                      style={{ color: "rgba(148,163,184,0.45)" }}
                      title="Muokkaa"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(tx.id, label)}
                      className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/[0.07]"
                      style={{ color: "rgba(248,113,113,0.45)" }}
                      title="Poista"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-[10px] transition-colors hover:text-white disabled:opacity-30"
                style={{ color: "rgba(148,163,184,0.55)" }}
              >
                ← Edellinen
              </button>
              <p
                className="text-[10px]"
                style={{ color: "rgba(148,163,184,0.45)" }}
              >
                {page + 1} / {totalPages}
              </p>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="text-[10px] transition-colors hover:text-white disabled:opacity-30"
                style={{ color: "rgba(148,163,184,0.55)" }}
              >
                Seuraava →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
