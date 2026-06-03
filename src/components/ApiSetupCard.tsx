"use client";

import { useEffect, useState } from "react";
import type { ApiKeyStatus, ConfigStatusResponse } from "@/app/api/config/status/route";

type LoadState = "loading" | "done" | "error";

const LOCAL_STORAGE_KEYS = [
  { key: "investment-os:portfolio", label: "Portfolio" },
  { key: "investment-os:watchlist", label: "Watchlist" },
  { key: "investment-os:alerts", label: "Hälytykset" },
  { key: "investment-os:news", label: "Uutiset" },
  { key: "investment-os:data-status", label: "Data-status" },
  { key: "investment-os:assistant-chat", label: "Chat-historia" },
];

function getLocalStorageSize(key: string): string {
  if (typeof window === "undefined") return "–";
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return "tyhjä";
    const bytes = new Blob([value]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  } catch {
    return "–";
  }
}

function StatusPill({ status }: { status: ApiKeyStatus | "loading" }) {
  if (status === "loading") {
    return (
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
        style={{ background: "rgba(148,163,184,0.1)", color: "rgba(148,163,184,0.55)" }}
      >
        …
      </span>
    );
  }
  if (status === "configured") {
    return (
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
        style={{ background: "rgba(74,222,128,0.12)", color: "rgba(134,239,172,0.9)" }}
      >
        Configured
      </span>
    );
  }
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
      style={{ background: "rgba(99,102,241,0.14)", color: "rgba(196,181,253,0.82)" }}
    >
      Mock fallback
    </span>
  );
}

const API_ROWS: { key: keyof ConfigStatusResponse; label: string; envVar: string; description: string }[] = [
  {
    key: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    description: "AI-agentti käyttää mock-vastauksia ilman avainta.",
  },
  {
    key: "twelveData",
    label: "Twelve Data",
    envVar: "MARKET_DATA_API_KEY",
    description: "Hintapäivitys käyttää mock-dataa ilman avainta.",
  },
  {
    key: "marketaux",
    label: "Marketaux",
    envVar: "MARKETAUX_API_KEY",
    description: "Uutispäivitys käyttää mock-uutisia ilman avainta.",
  },
];

export default function ApiSetupCard({ onClose }: { onClose?: () => void }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [config, setConfig] = useState<ConfigStatusResponse>({
    openai: "missing",
    twelveData: "missing",
    marketaux: "missing",
  });
  const [storageRefresh, setStorageRefresh] = useState(0);
  const [refreshLabel, setRefreshLabel] = useState<"idle" | "done">("idle");

  useEffect(() => {
    fetch("/api/config/status")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ConfigStatusResponse>;
      })
      .then((data) => {
        setConfig(data);
        setLoadState("done");
      })
      .catch(() => {
        setLoadState("error");
      });
  }, []);

  function handleStorageRefresh() {
    setStorageRefresh((n) => n + 1);
    setRefreshLabel("done");
    setTimeout(() => setRefreshLabel("idle"), 1500);
  }

  const allConfigured =
    config.openai === "configured" &&
    config.twelveData === "configured" &&
    config.marketaux === "configured";

  return (
    <div className="flex flex-col gap-4">

      {/* API Keys */}
      <div className="flex flex-col gap-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(148,163,184,0.45)" }}
        >
          API-avaimet
        </p>

        <div className="flex flex-col gap-1.5">
          {API_ROWS.map((row) => (
            <div
              key={row.key}
              className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
              style={{
                background: "rgba(255,255,255,0.026)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white">{row.label}</p>
                <StatusPill
                  status={loadState === "loading" ? "loading" : config[row.key]}
                />
              </div>
              <p
                className="text-[10px] leading-relaxed"
                style={{ color: "rgba(148,163,184,0.6)" }}
              >
                {row.description}
              </p>
              <p
                className="text-[9px] font-mono"
                style={{ color: "rgba(148,163,184,0.38)" }}
              >
                {row.envVar}
              </p>
            </div>
          ))}
        </div>

        {loadState === "error" && (
          <div
            className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
            style={{
              background: "rgba(248,113,113,0.07)",
              border: "1px solid rgba(248,113,113,0.12)",
              color: "rgba(254,202,202,0.82)",
            }}
          >
            Ei yhteyttä palvelimeen — API-avainten tila ei ole saatavilla. Lataa sivu uudelleen.
          </div>
        )}

        {!allConfigured && loadState === "done" && (
          <div
            className="rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
            style={{
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(139,92,246,0.12)",
              color: "rgba(196,181,253,0.75)",
            }}
          >
            Lisää puuttuvat avaimet{" "}
            <span className="font-mono text-[10px]">.env.local</span>-tiedostoon ja käynnistä
            dev server uudelleen. App toimii mock-datalla ilman avaimia.
          </div>
        )}
      </div>

      {/* localStorage */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            localStorage
          </p>
          <button
            type="button"
            onClick={handleStorageRefresh}
            className="text-[9px] transition-colors hover:text-white"
            style={{ color: "rgba(148,163,184,0.45)" }}
          >
            {refreshLabel === "done" ? "päivitetty ✓" : "päivitä"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {LOCAL_STORAGE_KEYS.map(({ key, label }) => {
            const size = getLocalStorageSize(key);
            const isEmpty = size === "tyhjä";
            return (
              <div
                key={key}
                className="rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 min-w-0"
                style={{
                  background: "rgba(255,255,255,0.022)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <p
                  className="text-[10px] font-medium truncate"
                  style={{ color: isEmpty ? "rgba(148,163,184,0.38)" : "rgba(203,213,225,0.75)" }}
                >
                  {label}
                </p>
                <p
                  className="text-[9px] shrink-0"
                  style={{ color: isEmpty ? "rgba(148,163,184,0.3)" : "rgba(148,163,184,0.55)" }}
                >
                  {size}
                </p>
              </div>
            );
          })}
        </div>

        <p
          className="text-[10px] leading-relaxed"
          style={{ color: "rgba(148,163,184,0.48)" }}
        >
          Kaikki data tallennetaan selaimesi localStorageen. Data ei lähde palvelimelle
          eikä kolmansille osapuolille. Export JSON lataa kaiken datan tiedostoksi.
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/[0.06] text-center"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(203,213,225,0.7)",
          }}
        >
          Sulje
        </button>
      )}
    </div>
  );
}
