"use client";

import { useEffect, useState } from "react";
import type { Transaction, TransactionType } from "@/lib/transactions";
import type { Currency } from "@/lib/portfolio/types";

const CURRENCIES: Currency[] = ["EUR", "USD", "SEK", "NOK", "GBP"];

const TYPE_LABELS: Record<TransactionType, string> = {
  buy: "Osto",
  sell: "Myynti",
  deposit: "Talletus",
  withdrawal: "Nosto",
  dividend: "Osinko",
  fee: "Kulu",
};

const NEEDS_SYMBOL: TransactionType[] = ["buy", "sell", "dividend"];
const NEEDS_QTY_PRICE: TransactionType[] = ["buy", "sell"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface FormState {
  type: TransactionType;
  symbol: string;
  name: string;
  quantity: string;
  price: string;
  amount: string;
  amountManual: boolean;
  currency: Currency;
  date: string;
  note: string;
}

function defaultForm(): FormState {
  return {
    type: "buy",
    symbol: "",
    name: "",
    quantity: "",
    price: "",
    amount: "",
    amountManual: false,
    currency: "EUR",
    date: today(),
    note: "",
  };
}

function formFromTransaction(tx: Transaction): FormState {
  return {
    type: tx.type,
    symbol: tx.symbol ?? "",
    name: tx.name ?? "",
    quantity: tx.quantity !== undefined ? String(tx.quantity) : "",
    price: tx.price !== undefined ? String(tx.price) : "",
    amount: String(tx.amount),
    amountManual: true,
    currency: tx.currency,
    date: tx.date,
    note: tx.note ?? "",
  };
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  min,
  step,
}: {
  label: string;
  type?: "text" | "number" | "date";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className="rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(148,163,184,0.12)",
        }}
      />
    </label>
  );
}

export default function AddTransactionModal({
  editTransaction,
  isOpen,
  onClose,
  onSave,
}: {
  editTransaction?: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, "id" | "createdAt">) => void;
}) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset / populate form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrors([]);
    setForm(editTransaction ? formFromTransaction(editTransaction) : defaultForm());
  }, [isOpen, editTransaction]);

  // Auto-calculate amount for buy/sell when qty or price changes
  useEffect(() => {
    if (!NEEDS_QTY_PRICE.includes(form.type)) return;
    if (form.amountManual) return;
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.price);
    if (isFinite(qty) && isFinite(price) && qty > 0 && price > 0) {
      setForm((f) => ({ ...f, amount: (qty * price).toFixed(2) }));
    }
  }, [form.type, form.quantity, form.price, form.amountManual]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleTypeChange(type: TransactionType) {
    setForm((f) => ({
      ...f,
      type,
      symbol: NEEDS_SYMBOL.includes(type) ? f.symbol : "",
      quantity: NEEDS_QTY_PRICE.includes(type) ? f.quantity : "",
      price: NEEDS_QTY_PRICE.includes(type) ? f.price : "",
      amountManual: false,
    }));
  }

  function validate(): string[] {
    const errs: string[] = [];
    const amount = parseFloat(form.amount);
    if (!isFinite(amount) || amount <= 0) errs.push("Summa täytyy olla positiivinen luku.");
    if (!form.date) errs.push("Päivämäärä puuttuu.");
    if (NEEDS_SYMBOL.includes(form.type) && !form.symbol.trim()) {
      errs.push("Symboli vaaditaan ostolle, myynneille ja osingoille.");
    }
    if (NEEDS_QTY_PRICE.includes(form.type)) {
      const qty = parseFloat(form.quantity);
      const price = parseFloat(form.price);
      if (!isFinite(qty) || qty <= 0) errs.push("Kpl-määrä täytyy olla positiivinen luku.");
      if (!isFinite(price) || price <= 0) errs.push("Hinta täytyy olla positiivinen luku.");
    }
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.price);
    onSave({
      type: form.type,
      symbol: NEEDS_SYMBOL.includes(form.type) ? form.symbol.trim().toUpperCase() || undefined : undefined,
      name: form.name.trim() || undefined,
      quantity: NEEDS_QTY_PRICE.includes(form.type) && isFinite(qty) ? qty : undefined,
      price: NEEDS_QTY_PRICE.includes(form.type) && isFinite(price) ? price : undefined,
      amount: parseFloat(form.amount),
      currency: form.currency,
      date: form.date,
      note: form.note.trim() || undefined,
    });
    onClose();
  }

  if (!isOpen) return null;

  const isEditing = Boolean(editTransaction);
  const showSymbol = NEEDS_SYMBOL.includes(form.type);
  const showQtyPrice = NEEDS_QTY_PRICE.includes(form.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl flex flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(18,21,31,0.98), rgba(8,13,25,0.98))",
          border: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.5)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-sm font-semibold text-white">
            {isEditing ? "Muokkaa transaktiota" : "Lisää transaktio"}
          </p>
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

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
              Tyyppi
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPE_LABELS) as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background:
                      form.type === t
                        ? "rgba(99,102,241,0.2)"
                        : "rgba(255,255,255,0.04)",
                    color:
                      form.type === t
                        ? "rgba(196,181,253,0.95)"
                        : "rgba(148,163,184,0.65)",
                    border:
                      form.type === t
                        ? "1px solid rgba(139,92,246,0.3)"
                        : "1px solid rgba(148,163,184,0.08)",
                  }}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <InputField
            label="Päivämäärä"
            type="date"
            value={form.date}
            onChange={(v) => setField("date", v)}
          />

          {/* Symbol + Name */}
          {showSymbol && (
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Symboli"
                value={form.symbol}
                onChange={(v) => setField("symbol", v.toUpperCase())}
                placeholder="esim. NVDA"
              />
              <InputField
                label="Nimi (valinnainen)"
                value={form.name}
                onChange={(v) => setField("name", v)}
                placeholder="esim. NVIDIA"
              />
            </div>
          )}

          {/* Qty + Price */}
          {showQtyPrice && (
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Kpl-määrä"
                type="number"
                min="0"
                step="0.0001"
                value={form.quantity}
                onChange={(v) => setField("quantity", v)}
                placeholder="0"
              />
              <InputField
                label="Hinta / kpl"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(v) => setField("price", v)}
                placeholder="0.00"
              />
            </div>
          )}

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <InputField
                label={showQtyPrice ? "Summa (auto)" : "Summa"}
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(v) => {
                  setField("amount", v);
                  setField("amountManual", true);
                }}
                placeholder="0.00"
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.5)" }}>
                Valuutta
              </span>
              <select
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value as Currency)}
                className="rounded-lg px-2 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500/40 h-full"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(148,163,184,0.12)",
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Note */}
          <InputField
            label="Muistiinpano (valinnainen)"
            value={form.note}
            onChange={(v) => setField("note", v)}
            placeholder="Vapaa huomio…"
          />

          {/* Errors */}
          {errors.length > 0 && (
            <div
              className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.15)",
              }}
            >
              {errors.map((err) => (
                <p key={err} className="text-[11px]" style={{ color: "rgba(252,165,165,0.9)" }}>
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-white/[0.05]"
            style={{
              background: "rgba(255,255,255,0.025)",
              color: "rgba(203,213,225,0.7)",
            }}
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-violet-600/30"
            style={{
              background: "rgba(99,102,241,0.18)",
              color: "rgba(196,181,253,0.95)",
              border: "1px solid rgba(139,92,246,0.22)",
            }}
          >
            {isEditing ? "Tallenna muutokset" : "Lisää transaktio"}
          </button>
        </div>
      </div>
    </div>
  );
}
