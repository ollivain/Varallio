"use client";

import { useState } from "react";
import type { OnboardingChecklist, OnboardingStep, OnboardingStepStatus } from "@/lib/onboarding";

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_ICON: Record<OnboardingStepStatus, React.ReactNode> = {
  done: (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 8 6.5 11.5 13 5" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" stroke="currentColor" strokeWidth={2}>
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="5" x2="8" y2="8.5" />
      <circle cx="8" cy="11" r="0.5" fill="currentColor" />
    </svg>
  ),
  todo: (
    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  ),
};

const STATUS_COLORS: Record<OnboardingStepStatus, { icon: string; label: string }> = {
  done: { icon: "rgba(134,239,172,0.7)", label: "rgba(134,239,172,0.55)" },
  warning: { icon: "rgba(253,230,138,0.8)", label: "rgba(253,230,138,0.75)" },
  todo: { icon: "rgba(148,163,184,0.35)", label: "rgba(148,163,184,0.35)" },
};

const STATUS_LABEL: Record<OnboardingStepStatus, string> = {
  done: "Valmis",
  warning: "Tarkista",
  todo: "Puuttuu",
};

// ── Action callbacks ───────────────────────────────────────────────────────────

export interface OnboardingActions {
  onOpenHoldingsManager: () => void;
  onOpenWatchlistManager: () => void;
  onOpenImportCsv: () => void;
  onOpenEditGoals: () => void;
  onOpenDataControls: () => void;
  onRefreshFx: () => Promise<unknown>;
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({
  step,
  actions,
}: {
  step: OnboardingStep;
  actions: OnboardingActions;
}) {
  const [fxLoading, setFxLoading] = useState(false);
  const colors = STATUS_COLORS[step.status];

  function handleCta() {
    switch (step.actionKey) {
      case "open_holdings_manager":
        actions.onOpenHoldingsManager();
        break;
      case "open_watchlist_manager":
        actions.onOpenWatchlistManager();
        break;
      case "open_import_csv":
        actions.onOpenImportCsv();
        break;
      case "open_edit_goals":
        actions.onOpenEditGoals();
        break;
      case "open_data_controls":
        actions.onOpenDataControls();
        break;
      case "refresh_fx":
        if (fxLoading) return;
        setFxLoading(true);
        void actions.onRefreshFx().finally(() => setFxLoading(false));
        break;
    }
  }

  return (
    <div
      className="flex items-start gap-2.5 py-2"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Status icon */}
      <span className="mt-0.5" style={{ color: colors.icon }}>
        {STATUS_ICON[step.status]}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-medium leading-snug"
          style={{
            color: step.status === "done" ? "rgba(148,163,184,0.55)" : "rgba(203,213,225,0.85)",
            textDecoration: step.status === "done" ? "line-through" : "none",
          }}
        >
          {step.title}
        </p>
        {step.status !== "done" && (
          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "rgba(100,116,139,0.6)" }}>
            {step.description}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span
        className="text-[9px] font-semibold uppercase tracking-wider shrink-0 mt-0.5"
        style={{ color: colors.label }}
      >
        {STATUS_LABEL[step.status]}
      </span>

      {/* CTA button */}
      {step.status !== "done" && step.ctaLabel && step.actionKey && (
        <button
          type="button"
          onClick={handleCta}
          disabled={fxLoading}
          className="rounded px-2 py-1 text-[9px] font-semibold shrink-0 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          style={{
            background: "rgba(99,102,241,0.1)",
            color: "rgba(196,181,253,0.82)",
            border: "1px solid rgba(139,92,246,0.14)",
          }}
        >
          {fxLoading ? "..." : step.ctaLabel}
        </button>
      )}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div
      className="h-1 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background:
            pct >= 100
              ? "rgba(134,239,172,0.6)"
              : pct >= 60
                ? "rgba(196,181,253,0.6)"
                : "rgba(251,191,36,0.5)",
        }}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingChecklistCard({
  checklist,
  actions,
}: {
  checklist: OnboardingChecklist;
  actions: OnboardingActions;
}) {
  // Start expanded if there are non-done non-backup steps
  const hasPendingMain = checklist.steps.some(
    (s) => s.id !== "backup" && s.status !== "done"
  );
  const [expanded, setExpanded] = useState(hasPendingMain);

  const { totalSteps, completedSteps } = checklist;

  // Compact "all done" state
  if (checklist.isComplete) {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: "rgba(74,222,128,0.04)",
          border: "1px solid rgba(74,222,128,0.1)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="w-3.5 h-3.5 shrink-0"
            stroke="rgba(134,239,172,0.7)"
            strokeWidth={2}
          >
            <polyline points="3 8 6.5 11.5 13 5" />
          </svg>
          <div>
            <p className="text-xs font-semibold" style={{ color: "rgba(134,239,172,0.85)" }}>
              Perus setup valmis
            </p>
            <p className="text-[10px]" style={{ color: "rgba(100,116,139,0.55)" }}>
              {completedSteps}/{totalSteps} vaihetta · Muista viedä backup säännöllisesti.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[9px] font-medium transition-colors hover:opacity-80"
          style={{ color: "rgba(148,163,184,0.45)" }}
        >
          {expanded ? "Piilota" : "Näytä"}
        </button>
      </div>
    );
  }

  return (
    <div
      className="glass-card px-4 py-4 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "rgba(148,163,184,0.45)" }}
            >
              Käyttöönotto
            </p>
            {checklist.warningCount > 0 && (
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
                style={{
                  background: "rgba(251,191,36,0.1)",
                  color: "rgba(253,230,138,0.75)",
                }}
              >
                {checklist.warningCount} tarkistettavaa
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(148,163,184,0.55)" }}>
            Tee nämä, jotta dashboard käyttää oikeaa dataasi.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] tabular-nums" style={{ color: "rgba(148,163,184,0.5)" }}>
            {completedSteps}/{totalSteps}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/[0.06]"
            style={{ color: "rgba(148,163,184,0.5)" }}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="w-3 h-3"
              stroke="currentColor"
              strokeWidth={2}
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <polyline points="4 6 8 10 12 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar value={completedSteps} total={totalSteps} />

      {/* Steps */}
      {expanded && (
        <div className="flex flex-col">
          {checklist.steps.map((step) => (
            <StepRow key={step.id} step={step} actions={actions} />
          ))}
        </div>
      )}

      {/* Next step hint when collapsed */}
      {!expanded && checklist.nextStep && (
        <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>
          Seuraava: <span style={{ color: "rgba(196,181,253,0.75)" }}>{checklist.nextStep.title}</span>
        </p>
      )}
    </div>
  );
}
