import type { Currency } from "@/lib/portfolio/types";
import type { Transaction, TransactionType } from "./types";
import type {
  ImportedTransactionRow,
  TransactionImportError,
  TransactionImportResult,
} from "./import";

// ── Supported currencies (same as Investment OS parser) ───────────────────────

const VALID_CURRENCIES = new Set<string>(["EUR", "USD", "SEK", "NOK", "GBP"]);

// ── Transaction type mapping ──────────────────────────────────────────────────
// Maps lowercased Nordnet event names (Finnish, English, Swedish) to our type.
// null = skip silently (e.g. internal transfers that have no investment meaning).

const TYPE_MAP: Partial<Record<string, TransactionType | null>> = {
  // Finnish
  osto: "buy",
  myynti: "sell",
  osinko: "dividend",
  talletus: "deposit",
  nosto: "withdrawal",
  välityspalkkio: "fee",
  palkkio: "fee",
  maksu: "fee",
  korkojaksotus: "fee",
  korko: "fee",
  lunastus: "sell",
  merkintä: "buy",
  merkinta: "buy",
  arvopaperivero: "fee",
  lähdevero: "fee",
  lahdevero: "fee",
  "siirto sisään": null,
  "siirto ulos": null,
  siirto: null,

  // English
  buy: "buy",
  sell: "sell",
  dividend: "dividend",
  deposit: "deposit",
  withdrawal: "withdrawal",
  fee: "fee",
  interest: "fee",
  subscription: "buy",
  redemption: "sell",
  transfer: null,
  "transfer in": null,
  "transfer out": null,

  // Swedish
  köp: "buy",
  sälj: "sell",
  utdelning: "dividend",
  insättning: "deposit",
  uttag: "withdrawal",
  courtage: "fee",
  avgift: "fee",
  inbetalning: "deposit",
  utbetalning: "withdrawal",
  ränta: "fee",
};

// ── Column name aliases ───────────────────────────────────────────────────────
// Maps lowercased column headers → our internal field key.

const COLUMN_ALIASES: Record<string, string> = {
  // Date
  päivä: "date",
  kirjauspäivä: "date",
  kaupantekopäivä: "date",
  "booking day": "date",
  "trade date": "date",
  date: "date",
  dag: "date",
  bokdag: "date",

  // Transaction type
  tapahtumatyyppi: "type",
  tapahtuma: "type",
  "transaction type": "type",
  "event type": "type",
  transaktionstyp: "type",
  händelsetyp: "type",

  // Instrument / name
  arvopaperi: "name",
  instrumentti: "name",
  instrumenttinimi: "name",
  "instrument name": "name",
  instrument: "name",
  security: "name",
  värdepapper: "name",
  "värdepappersnamn": "name",

  // Ticker / symbol
  tikkerisymboli: "symbol",
  ticker: "symbol",
  "instrument id": "symbol",
  instrumenttitunnus: "symbol",
  "verdepapper-id": "symbol",

  // ISIN (used as symbol fallback if no ticker)
  isin: "isin",

  // Quantity
  "määrä": "quantity",
  qty: "quantity",
  quantity: "quantity",
  "antal": "quantity",

  // Price
  kurssi: "price",
  price: "price",
  kurs: "price",

  // Amount (gross total, can be negative)
  summa: "amount",
  amount: "amount",
  belopp: "amount",
  kokonaissumma: "amount",
  "total amount": "amount",
  total: "amount",

  // Currency
  valuutta: "currency",
  currency: "currency",
  valuta: "currency",

  // Fees / commission
  kulut: "fee",
  provisio: "fee",
  commission: "fee",
  brokerage: "fee",
  courtage: "fee",
  "court.": "fee",
  avgift: "fee",

  // Trade / event ID (added to note for dedup)
  "tapahtuma-id": "id",
  vahvistusnumero: "id",
  "transaction id": "id",
  "trade id": "id",
  ordernr: "id",
  "order id": "id",
  transaktionsnr: "id",
};

// ── Low-level helpers ─────────────────────────────────────────────────────────

function detectSeparator(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const semiCount = (firstLine.match(/;/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount >= 2) return "\t";
  if (semiCount >= commaCount && semiCount >= 2) return ";";
  return ",";
}

function splitRow(line: string, sep: string): string[] {
  // Simple split — Nordnet doesn't generally quote fields with the same separator
  return line.split(sep).map((f) => f.trim().replace(/^"|"$/g, "").trim());
}

/** Parse Finnish/Nordic number format: comma as decimal sep, dot or space as thousands sep. */
function parseNordnetNumber(raw: string): number | undefined {
  const s = raw.trim();
  if (!s || s === "-" || s === "–") return undefined;
  let cleaned: string;
  if (s.includes(",")) {
    // Comma is decimal separator → remove dots/spaces (thousands seps)
    cleaned = s.replace(/[\s.]/g, "").replace(",", ".");
  } else {
    // Dot is decimal or absent → just remove spaces
    cleaned = s.replace(/\s/g, "");
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse date from YYYY-MM-DD, DD.MM.YYYY, or YYYY-MM-DD HH:MM:SS formats. */
function parseNordnetDate(raw: string): string | undefined {
  const s = raw.trim().replace(/\s.*$/, ""); // drop time portion
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return undefined;
}

/** Fingerprint for duplicate detection — mirrors the logic in import.ts. */
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

// ── Column index mapping ──────────────────────────────────────────────────────

type FieldKey = string;
type ColumnMap = Map<FieldKey, number>;

function buildColumnMap(headerFields: string[]): ColumnMap {
  const map = new Map<FieldKey, number>();
  for (let i = 0; i < headerFields.length; i++) {
    const normalized = headerFields[i].toLowerCase().trim().replace(/[""]/g, "");
    const key = COLUMN_ALIASES[normalized];
    if (key && !map.has(key)) {
      map.set(key, i);
    }
  }
  return map;
}

function getField(fields: string[], map: ColumnMap, key: FieldKey): string {
  const idx = map.get(key);
  return idx !== undefined ? (fields[idx] ?? "").trim() : "";
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Parses a Nordnet transaction export CSV and returns the same result shape
 * as parseCSV() so the modal UI can be shared.
 *
 * Supported separators: tab, semicolon, comma (auto-detected).
 * Supported date formats: YYYY-MM-DD, DD.MM.YYYY.
 * Supported number format: Finnish (comma decimal), English (dot decimal).
 * Does not throw; all issues are surfaced in errorRows.
 */
export function parseNordnetCSV(
  csvText: string,
  existingTransactions: Transaction[]
): TransactionImportResult {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  const validRows: ImportedTransactionRow[] = [];
  const errorRows: TransactionImportError[] = [];
  let duplicateCount = 0;

  if (lines.length === 0) {
    return { validRows, errorRows, duplicateCount, totalDataRows: 0 };
  }

  // Detect separator from first non-empty line
  const sep = detectSeparator(lines[0]);

  // Find and map header row
  const headerFields = splitRow(lines[0], sep);
  const colMap = buildColumnMap(headerFields);

  // Require at least a date and type column — otherwise the file is unrecognisable
  if (!colMap.has("date") && !colMap.has("type")) {
    return {
      validRows: [],
      errorRows: [
        {
          lineNumber: 1,
          rawLine: lines[0],
          reason:
            "Nordnet-sarakkeita ei tunnistettu. Varmista, että tiedosto on viety Nordnetistä ja sarakkeet ovat suomeksi tai englanniksi.",
        },
      ],
      duplicateCount: 0,
      totalDataRows: 0,
    };
  }

  const knownFingerprints = new Set<string>(
    existingTransactions.map((tx) => fingerprint(tx))
  );

  let nonBlankCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;
    nonBlankCount++;
    const lineNumber = i + 1; // 1-based, header = line 1
    const fields = splitRow(rawLine, sep);

    // ── Date ─────────────────────────────────────────────────────────────────
    const rawDate = getField(fields, colMap, "date");
    const date = parseNordnetDate(rawDate);
    if (!date) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Päivämäärää ei tunnistettu: "${rawDate || "(tyhjä)"}". Odotetaan YYYY-MM-DD tai PP.KK.VVVV.`,
      });
      continue;
    }

    // ── Transaction type ──────────────────────────────────────────────────────
    const rawType = getField(fields, colMap, "type");
    const typeLower = rawType.toLowerCase().trim();
    const mappedType = TYPE_MAP[typeLower];
    if (mappedType === undefined) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Tuntematon tapahtumatyyppi: "${rawType || "(tyhjä)"}".`,
      });
      continue;
    }
    if (mappedType === null) {
      // Silently skip (e.g. transfers)
      nonBlankCount--;
      continue;
    }
    const type: TransactionType = mappedType;

    // ── Amount ────────────────────────────────────────────────────────────────
    const rawAmount = getField(fields, colMap, "amount");
    const rawAmountNum = parseNordnetNumber(rawAmount);
    if (rawAmountNum === undefined) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Summa puuttuu tai ei tunnistettu: "${rawAmount || "(tyhjä)"}".`,
      });
      continue;
    }
    const amount = Math.abs(rawAmountNum);
    if (amount === 0) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: "Summa on nolla — rivi ohitetaan.",
      });
      continue;
    }

    // ── Currency ──────────────────────────────────────────────────────────────
    const rawCurrency = getField(fields, colMap, "currency").toUpperCase();
    if (!VALID_CURRENCIES.has(rawCurrency)) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: `Tunnistamaton valuutta: "${rawCurrency || "(tyhjä)"}". Tuetut: EUR, USD, SEK, NOK, GBP.`,
      });
      continue;
    }
    const currency = rawCurrency as Currency;

    // ── Symbol ────────────────────────────────────────────────────────────────
    let symbol: string | undefined = getField(fields, colMap, "symbol") || undefined;
    if (symbol) symbol = symbol.toUpperCase().replace(/\s/g, "");

    // ISIN as fallback symbol key if no ticker column
    const isin = getField(fields, colMap, "isin") || undefined;
    if (!symbol && isin) symbol = isin.toUpperCase().trim() || undefined;

    // ── Instrument name ───────────────────────────────────────────────────────
    const name = getField(fields, colMap, "name") || undefined;

    // ── Quantity & Price ──────────────────────────────────────────────────────
    const rawQty = getField(fields, colMap, "quantity");
    const quantity = rawQty ? parseNordnetNumber(rawQty) : undefined;

    const rawPrice = getField(fields, colMap, "price");
    const price = rawPrice ? parseNordnetNumber(rawPrice) : undefined;

    // ── Fee (included in note) ────────────────────────────────────────────────
    const rawFee = getField(fields, colMap, "fee");
    const feeNum = rawFee ? parseNordnetNumber(rawFee) : undefined;
    const feeNote =
      feeNum && Math.abs(feeNum) > 0
        ? `Kulut: ${Math.abs(feeNum)} ${currency}`
        : undefined;

    // ── Trade ID (added to note for traceability) ─────────────────────────────
    const tradeId = getField(fields, colMap, "id") || undefined;
    const idNote = tradeId ? `ID: ${tradeId}` : undefined;

    const noteParts = [feeNote, idNote].filter(Boolean);
    const note = noteParts.length > 0 ? noteParts.join(" · ") : undefined;

    // ── Type-specific validation ──────────────────────────────────────────────
    if (type === "buy" || type === "sell") {
      if (!symbol && !name) {
        errorRows.push({
          lineNumber,
          rawLine,
          reason: `${type === "buy" ? "Osto" : "Myynti"} vaatii symbolin tai instrumentin nimen.`,
        });
        continue;
      }
      // Use instrument name as symbol if no ticker available
      if (!symbol && name) {
        symbol = name.replace(/\s+/g, "-").toUpperCase().slice(0, 12);
      }
    }

    if (type === "dividend" && !symbol && !name) {
      errorRows.push({
        lineNumber,
        rawLine,
        reason: "Osinko vaatii symbolin tai instrumentin nimen.",
      });
      continue;
    }
    if (type === "dividend" && !symbol && name) {
      symbol = name.replace(/\s+/g, "-").toUpperCase().slice(0, 12);
    }

    // ── Build transaction ─────────────────────────────────────────────────────
    const tx: Omit<Transaction, "id" | "createdAt"> = {
      type,
      symbol: symbol || undefined,
      name: name || undefined,
      quantity: (type === "buy" || type === "sell") && quantity !== undefined && quantity > 0
        ? quantity
        : undefined,
      price:
        (type === "buy" || type === "sell") && price !== undefined && price > 0
          ? price
          : undefined,
      amount,
      currency,
      date,
      note,
    };

    // ── Duplicate check ───────────────────────────────────────────────────────
    const fp = fingerprint(tx);
    if (knownFingerprints.has(fp)) {
      duplicateCount++;
      errorRows.push({
        lineNumber,
        rawLine,
        reason:
          "Mahdollinen duplikaatti – identtinen transaktio on jo olemassa tai esiintyy useaan kertaan tässä tiedostossa.",
      });
      continue;
    }

    knownFingerprints.add(fp);
    validRows.push({ lineNumber, transaction: tx });
  }

  return { validRows, errorRows, duplicateCount, totalDataRows: nonBlankCount };
}
