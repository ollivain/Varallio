import type {
  BackupData,
  BackupSummary,
  BackupValidationResult,
  InvestmentOSBackup,
} from "./types";
import { BACKUP_APP, BACKUP_VERSION } from "./types";

export function createBackup(data: BackupData): InvestmentOSBackup {
  return {
    version: BACKUP_VERSION,
    app: BACKUP_APP,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function parseBackup(jsonText: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Virheellinen JSON — tarkista tiedosto." };
  }
  return validateBackup(parsed);
}

export function validateBackup(value: unknown): BackupValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Tyhjä tai tuntematon rakenne." };
  }

  const obj = value as Record<string, unknown>;

  if (obj.app !== BACKUP_APP) {
    return {
      ok: false,
      error: `Ei Investment OS -backup. Sovellus: "${String(obj.app ?? "?")}".`,
    };
  }

  if (typeof obj.version !== "number" || obj.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Versio ${String(obj.version ?? "?")} ei ole tuettu. Tuettu: ${BACKUP_VERSION}.`,
    };
  }

  if (!obj.exportedAt || typeof obj.exportedAt !== "string") {
    return { ok: false, error: "Kenttä exportedAt puuttuu." };
  }

  const data = obj.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Kenttä data puuttuu." };
  }

  const d = data as Record<string, unknown>;

  if (!d.portfolio || typeof d.portfolio !== "object") {
    return { ok: false, error: "data.portfolio puuttuu." };
  }
  if (!d.watchlist || typeof d.watchlist !== "object") {
    return { ok: false, error: "data.watchlist puuttuu." };
  }
  if (!Array.isArray(d.alerts)) {
    return { ok: false, error: "data.alerts puuttuu." };
  }
  if (!Array.isArray(d.transactions)) {
    return { ok: false, error: "data.transactions puuttuu." };
  }

  return { ok: true, backup: value as InvestmentOSBackup };
}

export function summarizeBackup(backup: InvestmentOSBackup): BackupSummary {
  const { data } = backup;
  return {
    exportedAt: backup.exportedAt,
    version: backup.version,
    holdingsCount: data.portfolio.holdings.length,
    cashCount: data.portfolio.cash.length,
    watchlistCount: data.watchlist.items.length,
    alertsCount: data.alerts.length,
    newsCount: Array.isArray(data.news) ? data.news.length : 0,
    transactionsCount: data.transactions.length,
    hasGoals:
      !!data.goalSettings &&
      Array.isArray(data.goalSettings.allocationTargets) &&
      data.goalSettings.allocationTargets.length > 0,
    fxSource: data.fxRates?.source ?? "?",
    fxUpdatedAt: data.fxRates?.updatedAt ?? "?",
  };
}
