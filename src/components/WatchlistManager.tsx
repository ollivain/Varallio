"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Currency } from "@/lib/portfolio";
import type { Watchlist, WatchlistAssetType, WatchlistItem } from "@/lib/watchlist";
import { formatCurrency } from "@/lib/formatters";

type WatchlistFormState = {
  name: string;
  ticker: string;
  assetType: WatchlistAssetType;
  currency: Currency;
  currentPrice: string;
  previousClosePrice: string;
  exchange: string;
  sector: string;
  region: string;
  notes: string;
  tags: string;
};

type ParsedWatchlistInput = Omit<WatchlistItem, "id" | "addedAt">;

const ASSET_TYPE_OPTIONS: WatchlistAssetType[] = [
  "stock",
  "etf",
  "crypto",
  "commodity",
  "currency",
  "index",
  "other",
];

const CURRENCY_OPTIONS: Currency[] = ["EUR", "USD", "SEK", "NOK", "GBP"];

const ASSET_TYPE_LABELS: Record<WatchlistAssetType, string> = {
  stock: "Osake",
  etf: "ETF",
  crypto: "Krypto",
  commodity: "Raaka-aine",
  currency: "Valuutta",
  index: "Indeksi",
  other: "Muu",
};

function createEmptyForm(): WatchlistFormState {
  return {
    name: "",
    ticker: "",
    assetType: "stock",
    currency: "EUR",
    currentPrice: "",
    previousClosePrice: "",
    exchange: "",
    sector: "",
    region: "",
    notes: "",
    tags: "",
  };
}

function createFormFromItem(item: WatchlistItem): WatchlistFormState {
  return {
    name: item.name,
    ticker: item.ticker,
    assetType: item.assetType,
    currency: item.currency,
    currentPrice: String(item.currentPrice),
    previousClosePrice:
      item.previousClosePrice === undefined ? "" : String(item.previousClosePrice),
    exchange: item.exchange ?? "",
    sector: item.sector ?? "",
    region: item.region ?? "",
    notes: item.notes ?? "",
    tags: item.tags?.join(", ") ?? "",
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

function parseTags(value: string): string[] | undefined {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

function validateForm(form: WatchlistFormState): {
  error: string | null;
  itemInput: ParsedWatchlistInput | null;
} {
  const name = form.name.trim();
  const ticker = form.ticker.trim().toUpperCase();

  if (!name) {
    return { error: "Nimi ei saa olla tyhjä.", itemInput: null };
  }

  if (!ticker) {
    return { error: "Ticker ei saa olla tyhjä.", itemInput: null };
  }

  if (!form.assetType) {
    return { error: "Asset type vaaditaan.", itemInput: null };
  }

  if (!form.currency) {
    return { error: "Valuutta vaaditaan.", itemInput: null };
  }

  const currentPrice = parseNonNegativeNumber(form.currentPrice);
  if (currentPrice === null) {
    return { error: "Nykyhinnan pitää olla vähintään 0.", itemInput: null };
  }

  const previousClosePrice =
    form.previousClosePrice.trim() === ""
      ? undefined
      : parseNonNegativeNumber(form.previousClosePrice);

  if (previousClosePrice === null) {
    return {
      error: "Edellisen päätöshinnan pitää olla tyhjä tai vähintään 0.",
      itemInput: null,
    };
  }

  return {
    error: null,
    itemInput: {
      name,
      ticker,
      assetType: form.assetType,
      currency: form.currency,
      currentPrice,
      previousClosePrice,
      exchange: form.exchange.trim() || undefined,
      sector: form.sector.trim() || undefined,
      region: form.region.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tags: parseTags(form.tags),
    },
  };
}

function createWatchlistItemId(ticker: string): string {
  return `watch-${ticker.toLowerCase()}-${Date.now()}`;
}

function updateWatchlistItems(watchlist: Watchlist, items: WatchlistItem[]): Watchlist {
  return {
    ...watchlist,
    items,
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

function WatchlistForm({
  editingItem,
  error,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  editingItem: WatchlistItem | null;
  error: string | null;
  form: WatchlistFormState;
  onCancel: () => void;
  onChange: (patch: Partial<WatchlistFormState>) => void;
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
            {editingItem ? "Muokkaa seurattavaa" : "Lisää seurattava"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Muutokset päivittyvät Seurantalista-korttiin ja agentin kontekstiin.
          </p>
        </div>
        {editingItem ? (
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
          placeholder="Microsoft"
          onChange={(value) => onChange({ name: value })}
        />
        <TextField
          label="Ticker"
          value={form.ticker}
          placeholder="MSFT"
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
          label="Pörssi"
          value={form.exchange}
          placeholder="NASDAQ"
          onChange={(value) => onChange({ exchange: value })}
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
        <TextField
          label="Tagit"
          value={form.tags}
          placeholder="AI, kasvu, seuranta"
          onChange={(value) => onChange({ tags: value })}
        />
        <div className="col-span-2">
          <TextField
            label="Muistiinpanot"
            value={form.notes}
            placeholder="Miksi tämä on seurannassa?"
            onChange={(value) => onChange({ notes: value })}
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
        {editingItem ? "Tallenna muutokset" : "Lisää seurattava"}
      </button>
    </div>
  );
}

function WatchlistRow({
  item,
  onDelete,
  onEdit,
}: {
  item: WatchlistItem;
  onDelete: (item: WatchlistItem) => void;
  onEdit: (item: WatchlistItem) => void;
}) {
  return (
    <div
      className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr_0.9fr_0.7fr] gap-3 items-center rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.045)",
      }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{item.name}</p>
        <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.58)" }}>
          {item.ticker} · {ASSET_TYPE_LABELS[item.assetType]}
        </p>
      </div>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {item.currency}
      </span>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {formatCurrency(item.currentPrice, { currency: item.currency, decimals: 2 })}
      </span>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {item.previousClosePrice === undefined
          ? "-"
          : formatCurrency(item.previousClosePrice, {
              currency: item.currency,
              decimals: 2,
            })}
      </span>
      <span className="text-xs truncate" style={{ color: "rgba(203,213,225,0.7)" }}>
        {item.tags?.join(", ") ?? "-"}
      </span>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(196,181,253,0.85)" }}
        >
          Muokkaa
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(248,113,113,0.78)" }}
        >
          Poista
        </button>
      </div>
    </div>
  );
}

export default function WatchlistManager({
  isOpen,
  onClose,
  setWatchlist,
  watchlist,
}: {
  isOpen: boolean;
  onClose: () => void;
  setWatchlist: Dispatch<SetStateAction<Watchlist>>;
  watchlist: Watchlist;
}) {
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [form, setForm] = useState<WatchlistFormState>(createEmptyForm);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function updateForm(patch: Partial<WatchlistFormState>) {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
    setError(null);
  }

  function resetForm() {
    setEditingItem(null);
    setForm(createEmptyForm());
    setError(null);
  }

  function handleEdit(item: WatchlistItem) {
    setEditingItem(item);
    setForm(createFormFromItem(item));
    setError(null);
  }

  function handleDelete(item: WatchlistItem) {
    const shouldDelete = window.confirm(`Poistetaanko seurattava ${item.name} (${item.ticker})?`);
    if (!shouldDelete) return;

    setWatchlist((currentWatchlist) =>
      updateWatchlistItems(
        currentWatchlist,
        currentWatchlist.items.filter((candidate) => candidate.id !== item.id)
      )
    );

    if (editingItem?.id === item.id) {
      resetForm();
    }
  }

  function handleSubmit() {
    const { error: validationError, itemInput } = validateForm(form);
    if (validationError || !itemInput) {
      setError(validationError ?? "Tarkista lomakkeen tiedot.");
      return;
    }

    setWatchlist((currentWatchlist) => {
      if (editingItem) {
        return updateWatchlistItems(
          currentWatchlist,
          currentWatchlist.items.map((item) =>
            item.id === editingItem.id
              ? {
                  ...itemInput,
                  id: item.id,
                  addedAt: item.addedAt,
                }
              : item
          )
        );
      }

      const newItem: WatchlistItem = {
        ...itemInput,
        id: createWatchlistItemId(itemInput.ticker),
        addedAt: new Date().toISOString(),
      };

      return updateWatchlistItems(currentWatchlist, [
        ...currentWatchlist.items,
        newItem,
      ]);
    });

    resetForm();
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
            <p className="text-sm font-semibold text-white">Hallinnoi seurantalistaa</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.6)" }}>
              {watchlist.name} · {watchlist.items.length} kohdetta
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

        <div className="grid grid-cols-[1fr_360px] gap-4 p-4 min-h-0 overflow-hidden">
          <div className="min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
            <div
              className="grid grid-cols-[1.25fr_0.8fr_0.8fr_0.9fr_0.9fr_0.7fr] gap-3 px-3 pb-1 text-[10px] uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.48)" }}
            >
              <span>Kohde</span>
              <span>Valuutta</span>
              <span>Hinta</span>
              <span>Ed. päätös</span>
              <span>Tagit</span>
              <span className="text-right">Toiminnot</span>
            </div>

            {watchlist.items.length > 0 ? (
              watchlist.items.map((item) => (
                <WatchlistRow
                  key={item.id}
                  item={item}
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
                Seurantalistalla ei ole vielä kohteita.
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto">
            <WatchlistForm
              editingItem={editingItem}
              error={error}
              form={form}
              onCancel={resetForm}
              onChange={updateForm}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
