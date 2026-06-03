import type { Currency } from "@/lib/portfolio/types";
import type { Transaction, TransactionType } from "./types";

// ── Public types ──────────────────────────────────────────────────────────────

export interface ImportedTransactionRow {
  /** 1-based line number in the source CSV (header = 1, first data row = 2) */
  lineNumber: number;
  transaction: Omit<Transaction, "id" | "createdAt">;
}

export interface TransactionImportError {
  lineNumber: number;
  rawLine: string;
  reason: string;
}

export interface TransactionImportResult {
  validRows: ImportedTransactionRow[];
  errorRows: TransactionImportError[];
  duplicateCount: number;
  /** Total data rows parsed (excluding header, excluding blank lines) */
  totalDataRows: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<string>([
  "buy",
  "sell",
  "deposit",
  "withdrawal",
  "dividend",
  "fee",
]);

const VALID_CURRENCIES = new Set<string>(["EUR", "USD", "SEK", "NOK", "GBP"]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Maximum CSV file size accepted (bytes). */
export const MAX_CSV_BYTES = 1_048_576; // 1 MB

/** CSV header that this parser expects / produces for the template. */
export const CSV_HEADER = "type,symbol,name,quantity,price,amount,currency,date,note";

// ── Low-level helpers ─────────────────────────────────────────────────────────

/**
 * Minimal CSV row parser.
 * Handles double-quoted fields (including commas inside them).
 * Does NOT handle multi-line fields — one physical line = one record.
 */
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped double-quote ""
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
}

function parsePositiveNumber(raw: string): number | undefined {
  const s = raw.replace(/\s/g, "").replace(",", ".");
  if (!s) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Creates a stable fingerprint used for duplicate detection.
 * Case-insensitive; coerces undefined to empty string.
 */
function fingerprint(tx: Omit<Transaction, "id" | "createdAt">): string {
  return [
    tx.type,
    (tx.symbol ?? "").toLowerCase(),
    tx.date,
    tx.quantity?.toFixed(4) ?? "",
    tx.price?.toFixed(4) ?? "",
    tx.amount.toFixed(4),
    (tx.note ?? "").toLowerCase(),
  ].join("|");
}

// ── Main export: CSV → TransactionImportResult ────────────────────────────────

/**
 * Parses a CSV string and returns valid + error rows.
 *
 * - Skips the header row when present.
 * - Validates each row against the Transaction model.
 * - Skips blank lines silently.
 * - Does not throw; all errors are surfaced in errorRows.
 * - Duplicate rows (against existingTransactions AND within the same CSV)
 *   are counted separately and returned as errors.
 */
export function parseCSV(
  csvText: string,
  existingTransactions: Transaction[]
): TransactionImportResult {
  // Normalise line endings
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  const validRows: ImportedTransactionRow[] = [];
  const errorRows: TransactionImportError[] = [];
  let duplicateCount = 0;

  // Build fingerprint set from existing transactions
  const knownFingerprints = new Set<string>(
    existingTransactions.map((tx) => fingerprint(tx))
  );

  // Detect header row
  const firstNonEmpty = lines.findIndex((l) => l.trim().length > 0);
  let dataStart = 0;
  if (firstNonEmpty !== -1) {
    const firstFields = parseRow(lines[firstNonEmpty]);
    if (firstFields[0]?.toLowerCase().trim() === "type") {
      dataStart = firstNonEmpty + 1;
    }
  }

  const dataLines = lines.slice(dataStart);
  let nonBlankCount = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const rawLine = dataLines[i];
    if (!rawLine.trim()) continue; // skip blank lines silently

    nonBlankCount++;
    const lineNumber = dataStart + i + 1; // 1-based absolute line number

    const fields = parseRow(rawLine);

    // Destructure the nine expected columns; extras in note are joined
    const [
      rawType = "",
      rawSymbol = "",
      rawName = "",
      rawQty = "",
      rawPrice = "",
      rawAmount = "",
      rawCurrency = "",
      rawDate = "",
      ...noteParts
    ] = fields;

    const rawNote = noteParts.join(",");

    // ── type ────────────────────────────────────────────────────────────────
    const typeLower = rawType.trim().toLowerCase();
    if (!VALID_TYPES.has(typeLower)) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Tuntematon tyyppi "${rawType.trim() || "(tyhjä)"}". Sallitut: buy, sell, deposit, withdrawal, dividend, fee.`,
      });
      continue;
    }
    const type = typeLower as TransactionType;

    // ── amount ──────────────────────────────────────────────────────────────
    const amount = parsePositiveNumber(rawAmount);
    if (amount === undefined) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Summa puuttuu tai on nolla/negatiivinen. Saatiin: "${rawAmount.trim() || "(tyhjä)"}".`,
      });
      continue;
    }

    // ── currency ────────────────────────────────────────────────────────────
    const currencyStr = rawCurrency.trim().toUpperCase();
    if (!VALID_CURRENCIES.has(currencyStr)) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Tuntematon valuutta "${rawCurrency.trim() || "(tyhjä)"}". Sallitut: EUR, USD, SEK, NOK, GBP.`,
      });
      continue;
    }
    const currency = currencyStr as Currency;

    // ── date ─────────────────────────────────────────────────────────────────
    const date = rawDate.trim();
    if (!date || !DATE_RE.test(date)) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Päivämäärä väärässä muodossa. Vaaditaan YYYY-MM-DD. Saatiin: "${date || "(tyhjä)"}".`,
      });
      continue;
    }

    // ── optional fields ──────────────────────────────────────────────────────
    const symbol = rawSymbol.trim().toUpperCase() || undefined;
    const name = rawName.trim() || undefined;
    const quantity = parsePositiveNumber(rawQty);
    const price = parsePositiveNumber(rawPrice);
    const note = rawNote.trim() || undefined;

    // ── type-specific validation ──────────────────────────────────────────────
    if (type === "buy" || type === "sell") {
      if (!symbol) {
        errorRows.push({
          lineNumber,
          rawLine,
          reason: `${type === "buy" ? "Osto" : "Myynti"} vaatii symbolin.`,
        });
        continue;
      }
      if (quantity === undefined) {
        errorRows.push({
          lineNumber,
          rawLine,
          reason: `${type === "buy" ? "Osto" : "Myynti"} vaatii positiivisen kappalemäärän.`,
        });
        continue;
      }
      if (price === undefined) {
        errorRows.push({
          lineNumber,
          rawLine,
          reason: `${type === "buy" ? "Osto" : "Myynti"} vaatii positiivisen kappalehinta.`,
        });
        continue;
      }
    }

    if (type === "dividend" && !symbol) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: "Osinko vaatii symbolin.",
      });
      continue;
    }

    // ── Build transaction ────────────────────────────────────────────────────
    const tx: Omit<Transaction, "id" | "createdAt"> = {
      type,
      symbol,
      name,
      quantity: type === "buy" || type === "sell" ? quantity : undefined,
      price: type === "buy" || type === "sell" ? price : undefined,
      amount,
      currency,
      date,
      note,
    };

    // ── Duplicate check ──────────────────────────────────────────────────────
    const fp = fingerprint(tx);
    if (knownFingerprints.has(fp)) {
      duplicateCount++;
      errorRows.push({
        lineNumber,
        rawLine,
        reason: "Mahdollinen duplikaatti – identtinen transaktio on jo olemassa tai esiintyy useaan kertaan tässä tiedostossa.",
      });
      continue;
    }

    knownFingerprints.add(fp);
    validRows.push({ lineNumber, transaction: tx });
  }

  return {
    validRows,
    errorRows,
    duplicateCount,
    totalDataRows: nonBlankCount,
  };
}

// ── Template generator ────────────────────────────────────────────────────────

/** Returns a CSV string with a header row and example transactions. */
export function generateCSVTemplate(): string {
  const rows = [
    CSV_HEADER,
    "deposit,,,,,5000,EUR,2026-01-01,Alkupääoma",
    "buy,NVDA,NVIDIA,2,900,1800,EUR,2026-01-05,Ensimmäinen osto",
    "buy,AAPL,Apple,5,180,900,USD,2026-02-10,",
    "dividend,NVDA,NVIDIA,,,12.50,EUR,2026-03-01,Osinkoa 2026",
    "sell,NVDA,NVIDIA,1,950,950,EUR,2026-04-01,Osittainen myynti",
    "fee,,,,,25,EUR,2026-05-01,Välityspalkkiot",
    "withdrawal,,,,,1000,EUR,2026-06-01,Käteinen ulos",
  ];
  return rows.join("\n");
}
