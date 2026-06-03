"use client";

import { useState } from "react";
import type { PriceAlert } from "@/lib/alerts";
import type { DataStatusState } from "@/lib/dataStatus";
import type { FXRatesResponse } from "@/lib/currency";
import type { NewsItem } from "@/lib/news";
import type { Portfolio } from "@/lib/portfolio";
import type { PortfolioGoalSettings } from "@/lib/goals";
import type { Transaction } from "@/lib/transactions";
import type { Watchlist } from "@/lib/watchlist";
import ApiSetupCard from "@/components/ApiSetupCard";
import { createBackup } from "@/lib/backup";
import { postLogout } from "@/components/AuthGate";

const ASSISTANT_CHAT_STORAGE_KEY = "investment-os:assistant-chat";

type Tab = "data" | "setup";

function clearAssistantChat() {
  try {
    window.localStorage.removeItem(ASSISTANT_CHAT_STORAGE_KEY);
  } catch {
    // Keep reset flow usable even if localStorage is unavailable.
  }
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatUpdateTime(value: string): string {
  return new Intl.DateTimeFormat("fi-FI", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ControlButton({
  children,
  disabled = false,
  onClick,
  tone = "default",
}: {
  children: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "default" | "warning" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        color:
          tone === "warning"
            ? "rgba(254,202,202,0.82)"
            : tone === "accent"
              ? "rgba(196,181,253,0.88)"
              : "rgba(203,213,225,0.82)",
        background: "rgba(255,255,255,0.025)",
      }}
    >
      {children}
    </button>
  );
}

export default function DataControls({
  alerts,
  dataStatus,
  goalSettings,
  isOpen,
  news,
  onClose,
  onOpenRestore,
  onRefreshPrices,
  onRefreshNews,
  onRefreshFxRates,
  portfolio,
  fxRates,
  resetAlerts,
  resetDataStatus,
  resetGoalSettings,
  resetNews,
  resetPortfolio,
  resetTransactions,
  resetWatchlist,
  transactions,
  watchlist,
}: {
  alerts: PriceAlert[];
  dataStatus: DataStatusState;
  isOpen: boolean;
  news: NewsItem[];
  onClose: () => void;
  onOpenRestore: () => void;
  onRefreshPrices: () => Promise<{ source: "api" | "mock"; hasErrors: boolean }>;
  onRefreshNews: () => Promise<{ source: "live" | "mock"; count: number }>;
  onRefreshFxRates: () => Promise<FXRatesResponse>;
  fxRates: FXRatesResponse;
  goalSettings: PortfolioGoalSettings;
  portfolio: Portfolio;
  resetAlerts: () => void;
  resetDataStatus: () => void;
  resetGoalSettings: () => void;
  resetNews: () => void;
  resetPortfolio: () => void;
  resetTransactions: () => void;
  resetWatchlist: () => void;
  transactions: Transaction[];
  watchlist: Watchlist;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("data");
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "done">("idle");
  const [refreshResult, setRefreshResult] = useState<{
    source: "api" | "mock";
    hasErrors: boolean;
    updatedAt: string;
  } | null>(null);
  const [newsRefreshState, setNewsRefreshState] = useState<"idle" | "loading" | "done">("idle");
  const [newsRefreshResult, setNewsRefreshResult] = useState<{
    source: "live" | "mock";
    count: number;
    updatedAt: string;
  } | null>(null);
  const [fxRefreshState, setFxRefreshState] = useState<"idle" | "loading" | "done">("idle");
  const [fxRefreshResult, setFxRefreshResult] = useState<FXRatesResponse | null>(null);

  if (!isOpen) return null;

  function confirmAndRun(message: string, action: () => void) {
    if (!window.confirm(message)) return;
    action();
  }

  function handleResetAll() {
    confirmAndRun("Palautetaanko kaikki demo-data alkutilaan?", () => {
      resetPortfolio();
      resetWatchlist();
      resetAlerts();
      resetNews();
      resetDataStatus();
      resetTransactions();
      resetGoalSettings();
      clearAssistantChat();
      onClose();
    });
  }

  function handleExport() {
    const backup = createBackup({
      portfolio,
      watchlist,
      alerts,
      news,
      transactions,
      goalSettings,
      dataStatus,
      fxRates,
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`investment-os-backup-${date}.json`, backup);
  }

  async function handleRefreshPrices() {
    if (refreshState === "loading") return;
    setRefreshState("loading");
    setRefreshResult(null);
    try {
      const result = await onRefreshPrices();
      setRefreshResult({ ...result, updatedAt: new Date().toISOString() });
      setRefreshState("done");
      setTimeout(() => {
        setRefreshState("idle");
        setRefreshResult(null);
      }, 3000);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DataControls] handleRefreshPrices threw unexpectedly");
      }
      setRefreshState("idle");
    }
  }

  async function handleRefreshNews() {
    if (newsRefreshState === "loading") return;
    setNewsRefreshState("loading");
    setNewsRefreshResult(null);
    try {
      const result = await onRefreshNews();
      setNewsRefreshResult({ ...result, updatedAt: new Date().toISOString() });
      setNewsRefreshState("done");
      setTimeout(() => {
        setNewsRefreshState("idle");
        setNewsRefreshResult(null);
      }, 3000);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DataControls] handleRefreshNews threw unexpectedly");
      }
      setNewsRefreshState("idle");
    }
  }

  async function handleRefreshFxRates() {
    if (fxRefreshState === "loading") return;
    setFxRefreshState("loading");
    setFxRefreshResult(null);
    try {
      const result = await onRefreshFxRates();
      setFxRefreshResult(result);
      setFxRefreshState("done");
      setTimeout(() => {
        setFxRefreshState("idle");
        setFxRefreshResult(null);
      }, 3000);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[DataControls] handleRefreshFxRates threw unexpectedly");
      }
      setFxRefreshState("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2,6,23,0.68)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(18,21,31,0.98), rgba(8,13,25,0.98))",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.48)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Datahallinta</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.6)" }}>
              Päivitä hinnat, vie data tai tarkista API-asetukset.
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

        {/* Tabs */}
        <div
          className="flex shrink-0 px-5 pt-3 gap-1"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          {(["data", "setup"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors"
              style={{
                color: activeTab === tab ? "rgba(203,213,225,0.9)" : "rgba(148,163,184,0.5)",
                background: activeTab === tab ? "rgba(255,255,255,0.06)" : "transparent",
                borderBottom: activeTab === tab ? "2px solid rgba(139,92,246,0.7)" : "2px solid transparent",
              }}
            >
              {tab === "data" ? "Data" : "API & Asetukset"}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4">

          {activeTab === "data" && (
            <div className="flex flex-col gap-4">

              {/* Refresh prices */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Markkinahinnat
                </p>
                <ControlButton
                  tone="accent"
                  disabled={refreshState === "loading"}
                  onClick={() => void handleRefreshPrices()}
                >
                  {refreshState === "loading" ? "Haetaan..." : "Päivitä hinnat"}
                </ControlButton>
                {refreshState === "done" && refreshResult ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px]" style={{ color: "rgba(134,239,172,0.72)" }}>
                      {refreshResult.source === "api"
                        ? "Hinnat päivitetty live-lähteestä."
                        : "Hinnat päivitetty mock-lähteestä. Lisää MARKET_DATA_API_KEY live-dataa varten."}
                    </p>
                    {refreshResult.hasErrors ? (
                      <p className="text-[11px]" style={{ color: "rgba(251,191,36,0.65)" }}>
                        Osa tickereistä jäi ilman hintaa.
                      </p>
                    ) : null}
                    <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.52)" }}>
                      Lähde: {refreshResult.source === "api" ? "live" : "mock"} · {formatUpdateTime(refreshResult.updatedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.56)" }}>
                    Päivittää portfolion ja seurantalistan nykyhinnat Twelve Data -rajapinnasta (tai mock-datasta jos avain puuttuu).
                  </p>
                )}
              </div>

              {/* Refresh news */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Uutisdata
                </p>
                <ControlButton
                  tone="accent"
                  disabled={newsRefreshState === "loading"}
                  onClick={() => void handleRefreshNews()}
                >
                  {newsRefreshState === "loading" ? "Haetaan..." : "Päivitä uutiset"}
                </ControlButton>
                {newsRefreshState === "done" && newsRefreshResult ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px]" style={{ color: "rgba(134,239,172,0.72)" }}>
                      {newsRefreshResult.source === "live"
                        ? `Uutiset päivitetty (${newsRefreshResult.count} artikkelia).`
                        : `Uutiset päivitetty mock-lähteestä (${newsRefreshResult.count}). Lisää MARKETAUX_API_KEY live-uutisia varten.`}
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.52)" }}>
                      Lähde: {newsRefreshResult.source} · {formatUpdateTime(newsRefreshResult.updatedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.56)" }}>
                    Hakee ajankohtaisia uutisia portfolion ja seurantalistan tickereiden perusteella Marketaux-rajapinnasta (tai mock-datasta jos avain puuttuu).
                  </p>
                )}
              </div>

              {/* Refresh FX rates */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Valuuttakurssit
                </p>
                <ControlButton
                  tone="accent"
                  disabled={fxRefreshState === "loading"}
                  onClick={() => void handleRefreshFxRates()}
                >
                  {fxRefreshState === "loading" ? "Haetaan..." : "Päivitä valuuttakurssit"}
                </ControlButton>
                {fxRefreshState === "done" && fxRefreshResult ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px]" style={{ color: "rgba(134,239,172,0.72)" }}>
                      FX päivitetty: {fxRefreshResult.source === "live" ? "live ECB" : "static fallback"}.
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.52)" }}>
                      Lähde: {fxRefreshResult.source} · {formatUpdateTime(fxRefreshResult.updatedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.56)" }}>
                    Hakee EUR-pohjaiset FX-kurssit serverin kautta. Nykyinen lähde: {fxRates.source} · {formatUpdateTime(fxRates.updatedAt)}
                  </p>
                )}
              </div>

              {/* Export / Restore */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Backup & palautus
                </p>
                <ControlButton onClick={handleExport}>Vie täysi backup</ControlButton>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.56)" }}>
                  Lataa koko sovelluksen data JSON-backup-tiedostona (portfolio, watchlist, hälytykset, uutiset, transaktiot, tavoitteet, FX-kurssit). Ei sisällä API-avaimia.
                </p>
                <ControlButton
                  tone="warning"
                  onClick={() => {
                    onClose();
                    onOpenRestore();
                  }}
                >
                  Palauta backup
                </ControlButton>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Palauttaa aiemmin viedyn backup-tiedoston. Korvaa nykyisen paikallisen datan.
                </p>
              </div>

              {/* Reset */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Resetoi demo-data
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ControlButton
                    tone="warning"
                    onClick={() =>
                      confirmAndRun("Palautetaanko portfolio demo-tilaan?", resetPortfolio)
                    }
                  >
                    Palauta portfolio
                  </ControlButton>
                  <ControlButton
                    tone="warning"
                    onClick={() =>
                      confirmAndRun("Palautetaanko watchlist demo-tilaan?", resetWatchlist)
                    }
                  >
                    Palauta watchlist
                  </ControlButton>
                  <ControlButton
                    tone="warning"
                    onClick={() =>
                      confirmAndRun("Palautetaanko hälytykset demo-tilaan?", resetAlerts)
                    }
                  >
                    Palauta hälytykset
                  </ControlButton>
                  <ControlButton
                    tone="warning"
                    onClick={() => confirmAndRun("Palautetaanko uutiset demo-tilaan?", resetNews)}
                  >
                    Palauta uutiset
                  </ControlButton>
                  <ControlButton
                    tone="warning"
                    onClick={() =>
                      confirmAndRun("Palautetaanko transaktiot demo-tilaan?", resetTransactions)
                    }
                  >
                    Palauta transaktiot
                  </ControlButton>
                  <ControlButton
                    tone="warning"
                    onClick={() =>
                      confirmAndRun("Palautetaanko tavoitteet oletusarvoihin?", resetGoalSettings)
                    }
                  >
                    Palauta tavoitteet
                  </ControlButton>
                </div>
                <ControlButton tone="warning" onClick={handleResetAll}>
                  Palauta kaikki demo-data
                </ControlButton>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.56)" }}>
                  Palauttaa myös assistant-chatin localStorage-historian.
                </p>
              </div>

            </div>
          )}

          {activeTab === "setup" && (
            <div className="flex flex-col gap-4">
              <ApiSetupCard />
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Istunto
                </p>
                <ControlButton
                  tone="warning"
                  onClick={() => {
                    void postLogout().then(() => {
                      window.location.reload();
                    });
                  }}
                >
                  Kirjaudu ulos
                </ControlButton>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.56)" }}>
                  Poistaa auth-cookien. Seuraava sivulataama pyytää salasanan uudelleen.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
