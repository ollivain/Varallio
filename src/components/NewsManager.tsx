"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { NewsItem, NewsSentiment } from "@/lib/news";

type NewsFormState = {
  title: string;
  source: string;
  publishedAt: string;
  tickers: string;
  summary: string;
  url: string;
  sentiment: NewsSentiment;
};

type ParsedNewsInput = Omit<NewsItem, "id" | "createdAt" | "updatedAt">;

const SENTIMENT_OPTIONS: NewsSentiment[] = ["positive", "neutral", "negative"];

function createEmptyForm(): NewsFormState {
  return {
    title: "",
    source: "",
    publishedAt: new Date().toISOString().slice(0, 16),
    tickers: "",
    summary: "",
    url: "",
    sentiment: "neutral",
  };
}

function toDateTimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 16);

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createFormFromNewsItem(item: NewsItem): NewsFormState {
  return {
    title: item.title,
    source: item.source,
    publishedAt: toDateTimeLocalValue(item.publishedAt),
    tickers: item.tickers?.join(", ") ?? "",
    summary: item.summary ?? "",
    url: item.url ?? "",
    sentiment: item.sentiment ?? "neutral",
  };
}

function parseTickers(value: string): string[] | undefined {
  const tickers = value
    .split(",")
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean);

  return tickers.length > 0 ? tickers : undefined;
}

function validateForm(form: NewsFormState): {
  error: string | null;
  newsInput: ParsedNewsInput | null;
} {
  const title = form.title.trim();
  const source = form.source.trim();

  if (!title) {
    return { error: "Otsikko ei saa olla tyhjä.", newsInput: null };
  }

  if (!source) {
    return { error: "Lähde ei saa olla tyhjä.", newsInput: null };
  }

  const publishedDate = new Date(form.publishedAt);
  if (Number.isNaN(publishedDate.getTime())) {
    return { error: "Julkaisuaika ei ole kelvollinen.", newsInput: null };
  }

  return {
    error: null,
    newsInput: {
      title,
      source,
      publishedAt: publishedDate.toISOString(),
      tickers: parseTickers(form.tickers),
      summary: form.summary.trim() || undefined,
      url: form.url.trim() || undefined,
      sentiment: form.sentiment,
    },
  };
}

function createNewsId(title: string): string {
  return `news-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
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
  type?: "datetime-local" | "text" | "url";
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
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
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: T[];
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
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewsForm({
  editingItem,
  error,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  editingItem: NewsItem | null;
  error: string | null;
  form: NewsFormState;
  onCancel: () => void;
  onChange: (patch: Partial<NewsFormState>) => void;
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
            {editingItem ? "Muokkaa uutista" : "Lisää uutinen"}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.58)" }}>
            Manuaalinen uutisrivi dashboardia varten.
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
        <div className="col-span-2">
          <TextField
            label="Otsikko"
            value={form.title}
            placeholder="NVIDIA julkaisi vahvan tulosraportin"
            onChange={(value) => onChange({ title: value })}
          />
        </div>
        <TextField
          label="Lähde"
          value={form.source}
          placeholder="Market Brief"
          onChange={(value) => onChange({ source: value })}
        />
        <TextField
          label="Julkaistu"
          type="datetime-local"
          value={form.publishedAt}
          onChange={(value) => onChange({ publishedAt: value })}
        />
        <TextField
          label="Tickerit"
          value={form.tickers}
          placeholder="NVDA, ASML"
          onChange={(value) => onChange({ tickers: value })}
        />
        <SelectField
          label="Sentiment"
          value={form.sentiment}
          options={SENTIMENT_OPTIONS}
          onChange={(value) => onChange({ sentiment: value })}
        />
        <div className="col-span-2">
          <TextField
            label="URL"
            type="url"
            value={form.url}
            placeholder="https://..."
            onChange={(value) => onChange({ url: value })}
          />
        </div>
        <div className="col-span-2">
          <TextField
            label="Tiivistelmä"
            value={form.summary}
            placeholder="Lyhyt kuvaus uutisesta"
            onChange={(value) => onChange({ summary: value })}
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
        {editingItem ? "Tallenna muutokset" : "Lisää uutinen"}
      </button>
    </div>
  );
}

function NewsListRow({
  item,
  onDelete,
  onEdit,
}: {
  item: NewsItem;
  onDelete: (item: NewsItem) => void;
  onEdit: (item: NewsItem) => void;
}) {
  return (
    <div
      className="grid grid-cols-[1.35fr_0.75fr_0.8fr_0.75fr_0.7fr] gap-3 items-center rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.045)",
      }}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{item.title}</p>
        <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.58)" }}>
          {item.source}
        </p>
      </div>
      <span className="text-xs" style={{ color: "rgba(203,213,225,0.82)" }}>
        {new Date(item.publishedAt).toLocaleDateString("fi-FI")}
      </span>
      <span className="text-xs truncate" style={{ color: "rgba(203,213,225,0.72)" }}>
        {item.tickers?.join(", ") ?? "-"}
      </span>
      <span
        className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 w-fit"
        style={{
          background: "rgba(99,102,241,0.1)",
          color: "rgba(196,181,253,0.72)",
        }}
      >
        {item.sentiment ?? "neutral"}
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

export default function NewsManager({
  isOpen,
  news,
  onClose,
  setNews,
}: {
  isOpen: boolean;
  news: NewsItem[];
  onClose: () => void;
  setNews: Dispatch<SetStateAction<NewsItem[]>>;
}) {
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<NewsFormState>(createEmptyForm);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  function updateForm(patch: Partial<NewsFormState>) {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
    setError(null);
  }

  function resetForm() {
    setEditingItem(null);
    setForm(createEmptyForm());
    setError(null);
  }

  function handleEdit(item: NewsItem) {
    setEditingItem(item);
    setForm(createFormFromNewsItem(item));
    setError(null);
  }

  function handleDelete(item: NewsItem) {
    const shouldDelete = window.confirm(`Poistetaanko uutinen "${item.title}"?`);
    if (!shouldDelete) return;

    setNews((currentNews) => currentNews.filter((candidate) => candidate.id !== item.id));

    if (editingItem?.id === item.id) {
      resetForm();
    }
  }

  function handleSubmit() {
    const { error: validationError, newsInput } = validateForm(form);
    if (validationError || !newsInput) {
      setError(validationError ?? "Tarkista lomakkeen tiedot.");
      return;
    }

    const now = new Date().toISOString();

    setNews((currentNews) => {
      if (editingItem) {
        return currentNews.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ...newsInput,
                createdAt: item.createdAt,
                updatedAt: now,
              }
            : item
        );
      }

      const newItem: NewsItem = {
        ...newsInput,
        id: createNewsId(newsInput.title),
        createdAt: now,
        updatedAt: now,
      };

      return [...currentNews, newItem];
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
            <p className="text-sm font-semibold text-white">Hallinnoi uutisia</p>
            <p className="text-[11px]" style={{ color: "rgba(148,163,184,0.6)" }}>
              {news.length} uutista
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
              className="grid grid-cols-[1.35fr_0.75fr_0.8fr_0.75fr_0.7fr] gap-3 px-3 pb-1 text-[10px] uppercase tracking-wider"
              style={{ color: "rgba(148,163,184,0.48)" }}
            >
              <span>Uutinen</span>
              <span>Julkaistu</span>
              <span>Tickerit</span>
              <span>Sentimentti</span>
              <span className="text-right">Toiminnot</span>
            </div>

            {news.length > 0 ? (
              news.map((item) => (
                <NewsListRow
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
                Uutisia ei ole vielä.
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto">
            <NewsForm
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
