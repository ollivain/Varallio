"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AssetType, CashPosition, Currency, Holding, Portfolio } from "@/lib/portfolio";
import { formatCurrency, formatNumber } from "@/lib/formatters";

type EditableAssetType = Exclude<AssetType, "cash">;

type HoldingFormState = {
  name: string;
  ticker: string;
  assetType: EditableAssetType;
  currency: Currency;
  quantity: string;
  averageBuyPrice: string;
  currentPrice: string;
  previousClosePrice: string;
  sector: string;
  region: string;
  exchange: string;
};

type ParsedHoldingInput = Omit<Holding, "id">;

type CashFormState = {
  currency: Currency;
  amount: string;
};

type ParsedCashInput = Omit<CashPosition, "id">;

type ManagerTab = "holdings" | "cash";

const ASSET_TYPE_OPTIONS: EditableAssetType[] = [
  "stock",
  "etf",
  "crypto",
  "bond",
  "commodity",
  "other",
];

const CURRENCY_OPTIONS: Currency[] = ["EUR", "USD", "SEK", "NOK", "GBP"];

const ASSET_TYPE_LABELS: Record<EditableAssetType, string> = {
  stock: "Osake",
  etf: "ETF",
  crypto: "Krypto",
  bond: "Korko",
  commodity: "Raaka-aine",
  other: "Muu",
};

function createEmptyForm(): HoldingFormState {
  return {
    name: "",
    ticker: "",
    assetType: "stock",
    currency: "EUR",
    quantity: "",
    averageBuyPrice: "",
    currentPrice: "",
    previousClosePrice: "",
    sector: "",
    region: "",
    exchange: "",
  };
}

function createFormFromHolding(holding: Holding): HoldingFormState {
  return {
    name: holding.name,
    ticker: holding.ticker,
    assetType: holding.assetType === "cash" ? "stock" : holding.assetType,
    currency: holding.currency,
    quantity: String(holding.quantity),
    averageBuyPrice: String(holding.averageBuyPrice),
    currentPrice: String(holding.currentPrice),
    previousClosePrice:
      holding.previousClosePrice === undefined ? "" : String(holding.previousClosePrice),
    sector: holding.sector ?? "",
    region: holding.region ?? "",
    exchange: holding.exchange ?? "",
  };
}

function createEmptyCashForm(): CashFormState {
  return {
    currency: "EUR",
    amount: "",
  };
}

function createFormFromCashPosition(cashPosition: CashPosition): CashFormState {
  return {
    currency: cashPosition.currency,
    amount: String(cashPosition.amount),
  };
}

function parseNonNegativeNumber(value: string): number | null {
  if (value.trim() === "") return null;

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function validateForm(form: HoldingFormState): {
  error: string | null;
  holdingInput: ParsedHoldingInput | null;
} {
  const name = form.name.trim();
  const ticker = form.ticker.trim().toUpperCase();

  if (!name) {
    return { error: "Nimi ei saa olla tyhjä.", holdingInput: null };
  }

  if (!ticker) {
    return { error: "Ticker ei saa olla tyhjä.", holdingInput: null };
  }

  const quantity = parseNonNegativeNumber(form.quantity);
  if (quantity === null) {
    return { error: "Määrän pitää olla vähintään 0.", holdingInput: null };
  }

  const averageBuyPrice = parseNonNegativeNumber(form.averageBuyPrice);
  if (averageBuyPrice === null) {
    return { error: "Keskihankintahinnan pitää olla vähintään 0.", holdingInput: null };
  }

  const currentPrice = parseNonNegativeNumber(form.currentPrice);
  if (currentPrice === null) {
    return { error: "Nykyhinnan pitää olla vähintään 0.", holdingInput: null };
  }

  const previousClosePrice =
    form.previousClosePrice.trim() === ""
      ? undefined
      : parseNonNegativeNumber(form.previousClosePrice);

  if (previousClosePrice === null) {
    return { error: "Edellisen päätöshinnan pitää olla tyhjä tai vähintään 0.", holdingInput: null };
  }

  return {
    error: null,
    holdingInput: {
      name,
      ticker,
      assetType: form.assetType,
      currency: form.currency,
      quantity,
      averageBuyPrice,
      currentPrice,
      previousClosePrice,
      sector: form.sector.trim() || undefined,
      region: form.region.trim() || undefined,
      exchange: form.exchange.trim() || undefined,
    },
  };
}

function validateCashForm(form: CashFormState): {
  error: string | null;
  cashInput: ParsedCashInput | null;
} {
  if (!form.currency) {
    return { error: "Valuutta vaaditaan.", cashInput: null };
  }

  const amount = parseNonNegativeNumber(form.amount);
  if (amount === null) {
    return { error: "Käteismäärän pitää olla vähintään 0.", cashInput: null };
  }

  return {
    error: null,
    cashInput: {
      currency: form.currency,
      amount,
    },
  };
}

function createHoldingId(ticker: string): string {
  return `holding-${ticker.toLowerCase()}-${Date.now()}`;
}

function createCashPositionId(currency: Currency): string {
  return `cash-${currency.toLowerCase()}-${Date.now()}`;
}

function updatePortfolioHoldings(
  portfolio: Portfolio,
  holdings: Holding[]
): Portfolio {
  return {
    ...portfolio,
    holdings,
    updatedAt: new Date().toISOString(),
  };
}

function updatePortfolioCash(
  portfolio: Portfolio,
  cash: CashPosition[]
): Portfolio {
  return {
    ...portfolio,
    cash,
    updatedAt: new Date().toISOString(),
  };
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label
      className="text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: "rgba(148,163,184,0.55)" }}
    >
      {children}
    </label>
  );
}

function textInputStyle() {
  return {
    background: "rgba(2,6,23,0.55)",
    border: "1px solid rgba(148,163,184,0.12)",
    color: "rgba(255,255,255,0.9)",
  };
}

function TextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-lg px-3 text-xs outline-none transition-colors focus:border-violet-400/35"
        style={textInputStyle()}
      />
    </div>
  );
}

function SelectField<T extends string>({
  label,
  onChange,
  options,
  renderLabel,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: T[];
  renderLabel?: (value: T) => string;
  value: T;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 rounded-lg px-3 text-xs outline-none transition-colors focus:border-violet-400/35"
        style={textInputStyle()}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {renderLabel ? renderLabel(option) : option}
          </option>
        ))}
      </select>
    </div>
  );
}

function HoldingForm({
  editingHolding,
  error,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  editingHolding: Holding | null;
  error: string | null;
  form: HoldingFormState;
  onCancel: () => void;
  onChange: (patch: Partial<HoldingFormState>) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "rgba(15,23,42,0.62)",
        border: "1px solid rgba(148,163,184,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white">
            {editingHolding ? "Muokkaa omistusta" : "Lisää omistus"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Muutokset tallentuvat paikallisesti tähän selaimeen.
          </p>
        </div>
        {editingHolding ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.05]"
            style={{ color: "rgba(148,163,184,0.7)" }}
          >
            Peruuta
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Nimi"
          value={form.name}
          placeholder="NVIDIA"
          onChange={(value) => onChange({ name: value })}
        />
        <TextField
          label="Ticker"
          value={form.ticker}
          placeholder="NVDA"
          onChange={(value) => onChange({ ticker: value })}
        />
        <SelectField
          label="Asset type"
          value={form.assetType}
          options={ASSET_TYPE_OPTIONS}
          renderLabel={(value) => ASSET_TYPE_LABELS[value]}
          onChange={(value) => onChange({ assetType: value })}
        />
        <SelectField
          label="Valuutta"
          value={form.currency}
          options={CURRENCY_OPTIONS}
          onChange={(value) => onChange({ currency: value })}
        />
        <TextField
          label="Määrä"
          type="number"
          value={form.quantity}
          onChange={(value) => onChange({ quantity: value })}
        />
        <TextField
          label="Keskihankintahinta"
          type="number"
          value={form.averageBuyPrice}
          onChange={(value) => onChange({ averageBuyPrice: value })}
        />
        <TextField
          label="Nykyhinta"
          type="number"
          value={form.currentPrice}
          onChange={(value) => onChange({ currentPrice: value })}
        />
        <TextField
          label="Edellinen päätös"
          type="number"
          value={form.previousClosePrice}
          onChange={(value) => onChange({ previousClosePrice: value })}
        />
        <TextField
          label="Sektori"
          value={form.sector}
          placeholder="Teknologia"
          onChange={(value) => onChange({ sector: value })}
        />
        <TextField
          label="Alue"
          value={form.region}
          placeholder="Yhdysvallat"
          onChange={(value) => onChange({ region: value })}
        />
        <div className="col-span-2">
          <TextField
            label="Pörssi"
            value={form.exchange}
            placeholder="NASDAQ"
            onChange={(value) => onChange({ exchange: value })}
          />
        </div>
      </div>

      {error ? (
        <div
          className="rounded-lg px-3 py-2 text-[11px]"
          style={{
            background: "rgba(248,113,113,0.1)",
            color: "rgba(254,202,202,0.92)",
            border: "1px solid rgba(248,113,113,0.16)",
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        className="h-9 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
      >
        {editingHolding ? "Tallenna muutokset" : "Lisää omistus"}
      </button>
    </div>
  );
}

function CashForm({
  editingCashPosition,
  error,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  editingCashPosition: CashPosition | null;
  error: string | null;
  form: CashFormState;
  onCancel: () => void;
  onChange: (patch: Partial<CashFormState>) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: "rgba(15,23,42,0.62)",
        border: "1px solid rgba(148,163,184,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white">
            {editingCashPosition ? "Muokkaa käteistä" : "Lisää käteinen"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Käteinen huomioidaan salkun arvossa ja allokaatiossa.
          </p>
        </div>
        {editingCashPosition ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.05]"
            style={{ color: "rgba(148,163,184,0.7)" }}
          >
            Peruuta
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Valuutta"
          value={form.currency}
          options={CURRENCY_OPTIONS}
          onChange={(value) => onChange({ currency: value })}
        />
        <TextField
          label="Määrä"
          type="number"
          value={form.amount}
          onChange={(value) => onChange({ amount: value })}
        />
      </div>

      {error ? (
        <div
          className="rounded-lg px-3 py-2 text-[11px]"
          style={{
            background: "rgba(248,113,113,0.1)",
            color: "rgba(254,202,202,0.92)",
            border: "1px solid rgba(248,113,113,0.16)",
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        className="h-9 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
      >
        {editingCashPosition ? "Tallenna muutokset" : "Lisää käteinen"}
      </button>
    </div>
  );
}

function HoldingRow({
  holding,
  onDelete,
  onEdit,
}: {
  holding: Holding;
  onDelete: (holding: Holding) => void;
  onEdit: (holding: Holding) => void;
}) {
  return (
    <div
      className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.9fr_0.7fr] gap-3 items-center rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.045)",
      }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{holding.name}</p>
        <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.58)" }}>
          {holding.ticker} · {ASSET_TYPE_LABELS[holding.assetType === "cash" ? "other" : holding.assetType]}
        </p>
      </div>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {formatNumber(holding.quantity, 2)}
      </span>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {formatCurrency(holding.averageBuyPrice, { currency: holding.currency, decimals: 2 })}
      </span>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {formatCurrency(holding.currentPrice, { currency: holding.currency, decimals: 2 })}
      </span>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {holding.previousClosePrice === undefined
          ? "-"
          : formatCurrency(holding.previousClosePrice, {
              currency: holding.currency,
              decimals: 2,
            })}
      </span>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(holding)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(196,181,253,0.85)" }}
        >
          Muokkaa
        </button>
        <button
          type="button"
          onClick={() => onDelete(holding)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(248,113,113,0.78)" }}
        >
          Poista
        </button>
      </div>
    </div>
  );
}

function CashRow({
  cashPosition,
  onDelete,
  onEdit,
}: {
  cashPosition: CashPosition;
  onDelete: (cashPosition: CashPosition) => void;
  onEdit: (cashPosition: CashPosition) => void;
}) {
  return (
    <div
      className="grid grid-cols-[1fr_1fr_0.8fr] gap-3 items-center rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.045)",
      }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{cashPosition.currency}</p>
        <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.58)" }}>
          Käteinen
        </p>
      </div>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {formatCurrency(cashPosition.amount, {
          currency: cashPosition.currency,
          decimals: 2,
        })}
      </span>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(cashPosition)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(196,181,253,0.85)" }}
        >
          Muokkaa
        </button>
        <button
          type="button"
          onClick={() => onDelete(cashPosition)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(248,113,113,0.78)" }}
        >
          Poista
        </button>
      </div>
    </div>
  );
}

export default function HoldingsManager({
  isOpen,
  onClose,
  portfolio,
  setPortfolio,
}: {
  isOpen: boolean;
  onClose: () => void;
  portfolio: Portfolio;
  setPortfolio: Dispatch<SetStateAction<Portfolio>>;
}) {
  const [activeTab, setActiveTab] = useState<ManagerTab>("holdings");
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [editingCashPosition, setEditingCashPosition] = useState<CashPosition | null>(null);
  const [form, setForm] = useState<HoldingFormState>(createEmptyForm);
  const [cashForm, setCashForm] = useState<CashFormState>(createEmptyCashForm);
  const [error, setError] = useState<string | null>(null);
  const [cashError, setCashError] = useState<string | null>(null);

  if (!isOpen) return null;

  function updateForm(patch: Partial<HoldingFormState>) {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
    setError(null);
  }

  function updateCashForm(patch: Partial<CashFormState>) {
    setCashForm((currentForm) => ({ ...currentForm, ...patch }));
    setCashError(null);
  }

  function resetForm() {
    setEditingHolding(null);
    setForm(createEmptyForm());
    setError(null);
  }

  function resetCashForm() {
    setEditingCashPosition(null);
    setCashForm(createEmptyCashForm());
    setCashError(null);
  }

  function handleTabChange(tab: ManagerTab) {
    setActiveTab(tab);
    setError(null);
    setCashError(null);
  }

  function handleEdit(holding: Holding) {
    setEditingHolding(holding);
    setForm(createFormFromHolding(holding));
    setError(null);
  }

  function handleCashEdit(cashPosition: CashPosition) {
    setEditingCashPosition(cashPosition);
    setCashForm(createFormFromCashPosition(cashPosition));
    setCashError(null);
  }

  function handleDelete(holding: Holding) {
    const shouldDelete = window.confirm(`Poistetaanko omistus ${holding.name} (${holding.ticker})?`);
    if (!shouldDelete) return;

    setPortfolio((currentPortfolio) =>
      updatePortfolioHoldings(
        currentPortfolio,
        currentPortfolio.holdings.filter((item) => item.id !== holding.id)
      )
    );

    if (editingHolding?.id === holding.id) {
      resetForm();
    }
  }

  function handleCashDelete(cashPosition: CashPosition) {
    const shouldDelete = window.confirm(`Poistetaanko käteispositio ${cashPosition.currency}?`);
    if (!shouldDelete) return;

    setPortfolio((currentPortfolio) =>
      updatePortfolioCash(
        currentPortfolio,
        currentPortfolio.cash.filter((item) => item.id !== cashPosition.id)
      )
    );

    if (editingCashPosition?.id === cashPosition.id) {
      resetCashForm();
    }
  }

  function handleSubmit() {
    const { error: validationError, holdingInput } = validateForm(form);
    if (validationError || !holdingInput) {
      setError(validationError ?? "Tarkista lomakkeen tiedot.");
      return;
    }

    setPortfolio((currentPortfolio) => {
      if (editingHolding) {
        return updatePortfolioHoldings(
          currentPortfolio,
          currentPortfolio.holdings.map((holding) =>
            holding.id === editingHolding.id
              ? {
                  ...holdingInput,
                  id: holding.id,
                }
              : holding
          )
        );
      }

      const newHolding: Holding = {
        ...holdingInput,
        id: createHoldingId(holdingInput.ticker),
      };

      return updatePortfolioHoldings(currentPortfolio, [
        ...currentPortfolio.holdings,
        newHolding,
      ]);
    });

    resetForm();
  }

  function handleCashSubmit() {
    const { error: validationError, cashInput } = validateCashForm(cashForm);
    if (validationError || !cashInput) {
      setCashError(validationError ?? "Tarkista käteistiedot.");
      return;
    }

    setPortfolio((currentPortfolio) => {
      if (editingCashPosition) {
        return updatePortfolioCash(
          currentPortfolio,
          currentPortfolio.cash.map((cashPosition) =>
            cashPosition.id === editingCashPosition.id
              ? {
                  ...cashInput,
                  id: cashPosition.id,
                }
              : cashPosition
          )
        );
      }

      const newCashPosition: CashPosition = {
        ...cashInput,
        id: createCashPositionId(cashInput.currency),
      };

      return updatePortfolioCash(currentPortfolio, [
        ...currentPortfolio.cash,
        newCashPosition,
      ]);
    });

    resetCashForm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(18,21,31,0.98), rgba(8,13,25,0.98))",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.48)",
        }}
      >
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Hallinnoi salkkua</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.6)" }}>
              {portfolio.name} · {portfolio.holdings.length} omistusta · {portfolio.cash.length} käteispositiota
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

        <div
          className="flex gap-1 px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {[
            { id: "holdings" as const, label: "Omistukset" },
            { id: "cash" as const, label: "Käteinen" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: isActive ? "rgba(99,102,241,0.16)" : "transparent",
                  color: isActive ? "rgba(221,214,254,0.95)" : "rgba(148,163,184,0.68)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-4 p-4 min-h-0 overflow-hidden">
          <div className={activeTab === "holdings" ? "min-h-0 overflow-y-auto pr-1 flex flex-col gap-2" : "hidden"}>
            <div
              className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.9fr_0.7fr] gap-3 px-3 pb-1 text-[10px] uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.48)" }}
            >
              <span>Omistus</span>
              <span>Määrä</span>
              <span>Keskihinta</span>
              <span>Nykyhinta</span>
              <span>Ed. päätös</span>
              <span className="text-right">Toiminnot</span>
            </div>

            {portfolio.holdings.length > 0 ? (
              portfolio.holdings.map((holding) => (
                <HoldingRow
                  key={holding.id}
                  holding={holding}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <div
                className="rounded-xl px-4 py-8 text-center text-xs"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  color: "rgba(148,163,184,0.68)",
                }}
              >
                Salkussa ei ole vielä omistuksia.
              </div>
            )}
          </div>

          <div className={activeTab === "holdings" ? "min-h-0 overflow-y-auto" : "hidden"}>
            <HoldingForm
              editingHolding={editingHolding}
              error={error}
              form={form}
              onCancel={resetForm}
              onChange={updateForm}
              onSubmit={handleSubmit}
            />
          </div>

          <div className={activeTab === "cash" ? "min-h-0 overflow-y-auto pr-1 flex flex-col gap-2" : "hidden"}>
            <div
              className="grid grid-cols-[1fr_1fr_0.8fr] gap-3 px-3 pb-1 text-[10px] uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.48)" }}
            >
              <span>Valuutta</span>
              <span>Määrä</span>
              <span className="text-right">Toiminnot</span>
            </div>

            {portfolio.cash.length > 0 ? (
              portfolio.cash.map((cashPosition) => (
                <CashRow
                  key={cashPosition.id}
                  cashPosition={cashPosition}
                  onEdit={handleCashEdit}
                  onDelete={handleCashDelete}
                />
              ))
            ) : (
              <div
                className="rounded-xl px-4 py-8 text-center text-xs"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  color: "rgba(148,163,184,0.68)",
                }}
              >
                Salkussa ei ole vielä käteispositioita.
              </div>
            )}
          </div>

          <div className={activeTab === "cash" ? "min-h-0 overflow-y-auto" : "hidden"}>
            <CashForm
              editingCashPosition={editingCashPosition}
              error={cashError}
              form={cashForm}
              onCancel={resetCashForm}
              onChange={updateCashForm}
              onSubmit={handleCashSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
