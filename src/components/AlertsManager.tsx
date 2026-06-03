"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AlertDirection, PriceAlert } from "@/lib/alerts";
import type { Currency } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/formatters";

type AlertFormState = {
  name: string;
  ticker: string;
  direction: AlertDirection;
  targetPrice: string;
  currency: Currency;
  note: string;
};

type ParsedAlertInput = Pick<
  PriceAlert,
  "name" | "ticker" | "direction" | "targetPrice" | "currency" | "note"
>;

const DIRECTION_OPTIONS: AlertDirection[] = ["above", "below"];
const CURRENCY_OPTIONS: Currency[] = ["EUR", "USD", "SEK", "NOK", "GBP"];

const DIRECTION_LABELS: Record<AlertDirection, string> = {
  above: "Yli",
  below: "Alle",
};

function createEmptyForm(): AlertFormState {
  return {
    name: "",
    ticker: "",
    direction: "above",
    targetPrice: "",
    currency: "EUR",
    note: "",
  };
}

function createFormFromAlert(alert: PriceAlert): AlertFormState {
  return {
    name: alert.name,
    ticker: alert.ticker,
    direction: alert.direction,
    targetPrice: String(alert.targetPrice),
    currency: alert.currency,
    note: alert.note ?? "",
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

function validateForm(form: AlertFormState): {
  alertInput: ParsedAlertInput | null;
  error: string | null;
} {
  const name = form.name.trim();
  const ticker = form.ticker.trim().toUpperCase();

  if (!name) {
    return { alertInput: null, error: "Nimi ei saa olla tyhjä." };
  }

  if (!ticker) {
    return { alertInput: null, error: "Ticker ei saa olla tyhjä." };
  }

  const targetPrice = parseNonNegativeNumber(form.targetPrice);
  if (targetPrice === null) {
    return { alertInput: null, error: "Tavoitehinnan pitää olla vähintään 0." };
  }

  return {
    alertInput: {
      name,
      ticker,
      direction: form.direction,
      targetPrice,
      currency: form.currency,
      note: form.note.trim() || undefined,
    },
    error: null,
  };
}

function createAlertId(ticker: string): string {
  return `alert-${ticker.toLowerCase()}-${Date.now()}`;
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

function AlertForm({
  editingAlert,
  error,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  editingAlert: PriceAlert | null;
  error: string | null;
  form: AlertFormState;
  onCancel: () => void;
  onChange: (patch: Partial<AlertFormState>) => void;
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
            {editingAlert ? "Muokkaa hälytystä" : "Lisää hälytys"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Hälytys arvioidaan nykyisistä portfolio- ja watchlist-hinnoista.
          </p>
        </div>
        {editingAlert ? (
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
          label="Suunta"
          value={form.direction}
          options={DIRECTION_OPTIONS}
          renderLabel={(value) => DIRECTION_LABELS[value]}
          onChange={(value) => onChange({ direction: value })}
        />
        <SelectField
          label="Valuutta"
          value={form.currency}
          options={CURRENCY_OPTIONS}
          onChange={(value) => onChange({ currency: value })}
        />
        <div className="col-span-2">
          <TextField
            label="Tavoitehinta"
            type="number"
            value={form.targetPrice}
            onChange={(value) => onChange({ targetPrice: value })}
          />
        </div>
        <div className="col-span-2">
          <TextField
            label="Muistiinpano"
            value={form.note}
            placeholder="Miksi tämä taso kiinnostaa?"
            onChange={(value) => onChange({ note: value })}
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
        {editingAlert ? "Tallenna muutokset" : "Lisää hälytys"}
      </button>
    </div>
  );
}

function AlertRow({
  alert,
  onDelete,
  onEdit,
}: {
  alert: PriceAlert;
  onDelete: (alert: PriceAlert) => void;
  onEdit: (alert: PriceAlert) => void;
}) {
  return (
    <div
      className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr_0.7fr_0.7fr] gap-3 items-center rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.045)",
      }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{alert.name}</p>
        <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.58)" }}>
          {alert.ticker}
        </p>
      </div>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {DIRECTION_LABELS[alert.direction]}
      </span>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {formatCurrency(alert.targetPrice, { currency: alert.currency, decimals: 2 })}
      </span>
      <span
        className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 w-fit"
        style={{
          background:
            alert.status === "triggered" ? "rgba(74,222,128,0.12)" : "rgba(99,102,241,0.1)",
          color:
            alert.status === "triggered"
              ? "rgba(134,239,172,0.95)"
              : "rgba(196,181,253,0.72)",
        }}
      >
        {alert.status}
      </span>
      <span className="text-xs truncate" style={{ color: "rgba(203,213,225,0.7)" }}>
        {alert.note || "-"}
      </span>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(alert)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(196,181,253,0.85)" }}
        >
          Muokkaa
        </button>
        <button
          type="button"
          onClick={() => onDelete(alert)}
          className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.06]"
          style={{ color: "rgba(248,113,113,0.78)" }}
        >
          Poista
        </button>
      </div>
    </div>
  );
}

export default function AlertsManager({
  alerts,
  isOpen,
  onClose,
  setAlerts,
}: {
  alerts: PriceAlert[];
  isOpen: boolean;
  onClose: () => void;
  setAlerts: Dispatch<SetStateAction<PriceAlert[]>>;
}) {
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [form, setForm] = useState<AlertFormState>(createEmptyForm);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function updateForm(patch: Partial<AlertFormState>) {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
    setError(null);
  }

  function resetForm() {
    setEditingAlert(null);
    setForm(createEmptyForm());
    setError(null);
  }

  function handleEdit(alert: PriceAlert) {
    setEditingAlert(alert);
    setForm(createFormFromAlert(alert));
    setError(null);
  }

  function handleDelete(alert: PriceAlert) {
    const shouldDelete = window.confirm(`Poistetaanko hälytys ${alert.name} (${alert.ticker})?`);
    if (!shouldDelete) return;

    setAlerts((currentAlerts) => currentAlerts.filter((candidate) => candidate.id !== alert.id));

    if (editingAlert?.id === alert.id) {
      resetForm();
    }
  }

  function handleSubmit() {
    const { alertInput, error: validationError } = validateForm(form);
    if (validationError || !alertInput) {
      setError(validationError ?? "Tarkista lomakkeen tiedot.");
      return;
    }

    const now = new Date().toISOString();

    setAlerts((currentAlerts) => {
      if (editingAlert) {
        return currentAlerts.map((alert) =>
          alert.id === editingAlert.id
            ? {
                ...alert,
                ...alertInput,
                status: "active",
                triggeredAt: undefined,
                updatedAt: now,
              }
            : alert
        );
      }

      const newAlert: PriceAlert = {
        ...alertInput,
        id: createAlertId(alertInput.ticker),
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      return [...currentAlerts, newAlert];
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
            <p className="text-sm font-semibold text-white">Hallinnoi hälytyksiä</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.6)" }}>
              {alerts.length} hintahälytystä
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
              className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr_0.7fr_0.7fr] gap-3 px-3 pb-1 text-[10px] uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.48)" }}
            >
              <span>Hälytys</span>
              <span>Suunta</span>
              <span>Tavoite</span>
              <span>Status</span>
              <span>Muistiinpano</span>
              <span className="text-right">Toiminnot</span>
            </div>

            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
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
                Hälytyksiä ei ole vielä.
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto">
            <AlertForm
              editingAlert={editingAlert}
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
