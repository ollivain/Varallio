import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";
import type { Transaction } from "@/lib/transactions";
import type { PortfolioGoalSettings } from "@/lib/goals";
import type { FXRateSource } from "@/lib/currency";
import type {
  OnboardingActionKey,
  OnboardingChecklist,
  OnboardingStep,
  OnboardingStepStatus,
} from "./types";

// ── Step definitions ──────────────────────────────────────────────────────────

interface StepDef {
  id: string;
  title: string;
  description: string;
  priority: number;
  ctaLabel: string;
  actionKey: OnboardingActionKey;
  resolve: (ctx: ChecklistContext) => OnboardingStepStatus;
}

interface ChecklistContext {
  portfolio: Portfolio;
  watchlist: Watchlist;
  transactions: Transaction[];
  goalSettings: PortfolioGoalSettings;
  fxSource: FXRateSource;
  marketSource: "live" | "mock";
  newsSource: "live" | "mock";
}

const STEP_DEFS: StepDef[] = [
  {
    id: "portfolio_data",
    title: "Lisää portfolio tai tuo transaktiot",
    description:
      "Lisää omistuksia tai tuo transaktiot CSV:stä. Tarvitaan, jotta dashboard näyttää oikean salkkusi.",
    priority: 1,
    ctaLabel: "Tuo CSV",
    actionKey: "open_import_csv",
    resolve: ({ portfolio, transactions }) =>
      portfolio.holdings.length > 0 || transactions.length > 0 ? "done" : "todo",
  },
  {
    id: "fx_rates",
    title: "Päivitä valuuttakurssit",
    description:
      "Hae live FX -kurssit ECB:ltä. Tarvitaan, jos salkussa on ei-EUR-positioita (USD, SEK, NOK, GBP).",
    priority: 2,
    ctaLabel: "Päivitä FX",
    actionKey: "refresh_fx",
    resolve: ({ fxSource }) => (fxSource === "live" ? "done" : "warning"),
  },
  {
    id: "market_prices",
    title: "Päivitä hinnat",
    description:
      "Hae live-hinnat portfoliolle ja watchlistille Twelve Data -rajapinnasta. Vaatii API-avaimen.",
    priority: 3,
    ctaLabel: "Päivitä hinnat",
    actionKey: "open_data_controls",
    resolve: ({ marketSource }) => (marketSource === "live" ? "done" : "warning"),
  },
  {
    id: "goals",
    title: "Määritä tavoiteallokaatio",
    description:
      "Aseta allokaatiotavoitteet Rebalance Plannerin ja Scenario Simulaattorin hyödyntämiseksi.",
    priority: 4,
    ctaLabel: "Muokkaa tavoitteita",
    actionKey: "open_edit_goals",
    resolve: ({ goalSettings }) =>
      goalSettings.allocationTargets.length > 0 ? "done" : "todo",
  },
  {
    id: "watchlist",
    title: "Lisää watchlist-kohteita",
    description: "Seuraa mielenkiintoisia sijoituskohteita News Intelligence -kerroksen avulla.",
    priority: 5,
    ctaLabel: "Lisää watchlist",
    actionKey: "open_watchlist_manager",
    resolve: ({ watchlist }) => (watchlist.items.length > 0 ? "done" : "todo"),
  },
  {
    id: "news",
    title: "Päivitä uutiset",
    description:
      "Hae live-uutiset Marketaux-rajapinnasta. Vaatii API-avaimen.",
    priority: 6,
    ctaLabel: "Päivitä uutiset",
    actionKey: "open_data_controls",
    resolve: ({ newsSource }) => (newsSource === "live" ? "done" : "warning"),
  },
  {
    id: "backup",
    title: "Vie täysi backup",
    description:
      "Tallenna salkkudata JSON-tiedostoksi. Tärkeää ennen selaimen tai laitteen vaihtoa.",
    priority: 7,
    ctaLabel: "Vie backup",
    actionKey: "open_data_controls",
    // Backup status cannot be auto-detected without persisting a flag.
    // Always shown as a reminder.
    resolve: () => "todo",
  },
];

// ── Main export ───────────────────────────────────────────────────────────────

export function buildOnboardingChecklist(ctx: ChecklistContext): OnboardingChecklist {
  const steps: OnboardingStep[] = STEP_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    status: def.resolve(ctx),
    priority: def.priority,
    ctaLabel: def.ctaLabel,
    actionKey: def.actionKey,
  }));

  const totalSteps = steps.length;
  const completedSteps = steps.filter((s) => s.status === "done").length;
  const warningCount = steps.filter((s) => s.status === "warning").length;

  // isComplete: all non-backup steps are "done"
  const mainSteps = steps.filter((s) => s.id !== "backup");
  const isComplete = mainSteps.every((s) => s.status === "done");

  const nextStep =
    steps.find((s) => s.id !== "backup" && s.status !== "done") ?? null;

  return { steps, totalSteps, completedSteps, warningCount, isComplete, nextStep };
}
