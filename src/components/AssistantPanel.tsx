"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { buildAgentContext, getMockAgentResponse } from "@/lib/agent";
import type { PriceAlert } from "@/lib/alerts";
import type { CompanySnapshot } from "@/lib/company";
import type { DataHealthSummary } from "@/lib/dataStatus";
import type { NewsItem, NewsProviderSource } from "@/lib/news";
import type { Portfolio } from "@/lib/portfolio";
import type { Watchlist } from "@/lib/watchlist";
import type { FXRateMap, FXRatesResponse } from "@/lib/currency";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  source?: "ai" | "mock";
};

const ASSISTANT_CHAT_STORAGE_KEY = "investment-os:assistant-chat";

const DEFAULT_SUGGESTIONS = [
  "Mikä salkussani vaatii eniten huomiota tänään?",
  "Selitä tärkeimmät portfolio insights.",
  "Mitkä uutiset vaikuttavat salkkuuni eniten?",
  "Mitä watchlistiltä kannattaa seurata?",
  "Mitä minun kannattaisi tarkistaa seuraavaksi?",
];

const fallbackDailyBrief = [
  "Korot ja keskuspankkikommentit",
  "AI-yhtiöiden tulosodotukset",
  "EUR/USD-liike ja öljyn hinta",
];

const initialMessages: ChatMessage[] = [
  {
    id: "initial-user-nvidia",
    role: "user",
    content: "Analysoi NVIDIA ja sen näkymät",
    createdAt: "2026-06-01T08:01:00.000Z",
  },
  {
    id: "initial-assistant-nvidia",
    role: "assistant",
    content:
      "NVIDIA hyötyy edelleen vahvasta AI-kysynnästä, mutta arvostustaso on korkea. Seuraisin erityisesti marginaaleja, datakeskusliikevaihtoa ja ohjeistusta.",
    createdAt: "2026-06-01T08:01:01.000Z",
  },
  {
    id: "initial-assistant-compare",
    role: "assistant",
    content: "Haluatko, että vertaan NVIDIAa AMD:hen ja ASML:ään?",
    createdAt: "2026-06-01T08:01:02.000Z",
  },
];

function createMessageId(role: ChatMessage["role"]): string {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ChatMessage>;
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function readStoredMessages(): ChatMessage[] | null {
  try {
    const rawMessages = window.localStorage.getItem(ASSISTANT_CHAT_STORAGE_KEY);
    if (!rawMessages) return null;

    const parsedMessages = JSON.parse(rawMessages);
    if (!Array.isArray(parsedMessages) || !parsedMessages.every(isChatMessage)) {
      removeStoredMessages();
      return null;
    }

    return parsedMessages;
  } catch {
    return null;
  }
}

function writeStoredMessages(messages: ChatMessage[]) {
  try {
    window.localStorage.setItem(ASSISTANT_CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Storage can be unavailable in private browsing or constrained environments.
  }
}

function removeStoredMessages() {
  try {
    window.localStorage.removeItem(ASSISTANT_CHAT_STORAGE_KEY);
  } catch {
    // Keep the UI usable even if storage access fails.
  }
}

function AssistantIcon() {
  return (
    <div
      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
      style={{
        background: "rgba(139,92,246,0.18)",
        border: "1px solid rgba(139,92,246,0.22)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5" stroke="#c4b5fd" strokeWidth={2}>
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    </div>
  );
}

function UserIcon() {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white"
      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
    >
      M
    </div>
  );
}

function AssistantHeader({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4 shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: "rgba(139,92,246,0.18)",
          border: "1px solid rgba(139,92,246,0.28)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="#c4b5fd" strokeWidth={1.8}>
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <h2 className="text-sm font-semibold text-white leading-none">Sijoitusagentti</h2>
        <p className="text-[11px] leading-none" style={{ color: "rgba(196,181,253,0.5)" }}>
          Salkku, uutiset, riskit — kysy mitä tahansa
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-white/[0.05]"
        style={{ color: "rgba(148,163,184,0.58)" }}
      >
        Tyhjennä
      </button>
    </div>
  );
}

function DailyBrief({ items }: { items: string[] }) {
  return (
    <div
      className="mx-4 my-1 rounded-xl p-3"
      style={{
        background: "rgba(99,102,241,0.09)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#a78bfa" }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(167,139,250,0.8)" }}>
          Tänään seurattavaa
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "rgba(100,116,139,0.7)" }}>
              -
            </span>
            <span className="text-[11px] leading-snug" style={{ color: "rgba(203,213,225,0.75)" }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextBadge({
  overallStatus,
  snapshotSymbol,
}: {
  overallStatus: string;
  snapshotSymbol?: string;
}) {
  const isMock = overallStatus === "mock" || overallStatus === "unknown";
  const isPartial = overallStatus === "partial";
  const isStale = overallStatus === "stale";

  return (
    <div
      className="px-4 py-2 flex items-center gap-2 flex-wrap shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <span className="text-[9px]" style={{ color: "rgba(100,116,139,0.58)" }}>
        Konteksti: Salkku · Uutiset · Insights{snapshotSymbol ? ` · ${snapshotSymbol}` : ""}
      </span>
      {isStale && (
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{
            background: "rgba(251,191,36,0.1)",
            color: "rgba(253,230,138,0.72)",
          }}
        >
          Stale
        </span>
      )}
      {isPartial && (
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{
            background: "rgba(251,191,36,0.1)",
            color: "rgba(253,230,138,0.72)",
          }}
        >
          Partial
        </span>
      )}
      {isMock && (
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{
            background: "rgba(99,102,241,0.1)",
            color: "rgba(196,181,253,0.72)",
          }}
        >
          Demo
        </span>
      )}
    </div>
  );
}

function SuggestionChips({
  disabled,
  items,
  onSuggestion,
}: {
  disabled: boolean;
  items: string[];
  onSuggestion: (suggestion: string) => void;
}) {
  return (
    <div className="px-4 flex flex-col gap-2">
      <p
        className="text-[10px] uppercase tracking-wider font-medium"
        style={{ color: "rgba(148,163,184,0.35)" }}
      >
        Pikakysymyksiä
      </p>
      <div className="flex flex-col gap-1">
        {items.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onSuggestion(suggestion)}
            className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "rgba(99,102,241,0.1)",
              color: "rgba(167,139,250,0.75)",
              fontSize: 11,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-2.5 h-2.5 shrink-0" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssistantMessages({
  dailyBriefItems,
  isThinking,
  messages,
  messagesEndRef,
  onSuggestion,
  suggestionItems,
}: {
  dailyBriefItems: string[];
  isThinking: boolean;
  messages: ChatMessage[];
  messagesEndRef: RefObject<HTMLDivElement>;
  onSuggestion: (suggestion: string) => void;
  suggestionItems: string[];
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto py-3 flex flex-col gap-3">
      <DailyBrief items={dailyBriefItems} />
      <SuggestionChips disabled={isThinking} items={suggestionItems} onSuggestion={onSuggestion} />

      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-2 px-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
        >
          {message.role === "assistant" ? <AssistantIcon /> : <UserIcon />}

          <div
            className="rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap"
            style={
              message.role === "user"
                ? {
                    background: "rgba(99,102,241,0.22)",
                    border: "1px solid rgba(139,92,246,0.22)",
                    color: "rgba(255,255,255,0.92)",
                    maxWidth: "82%",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(203,213,225,0.88)",
                    maxWidth: "88%",
                  }
            }
          >
            {message.content}
            {message.role === "assistant" && message.source === "mock" ? (
              <span
                className="block mt-1.5 text-[9px] font-medium tracking-wide"
                style={{ color: "rgba(100,116,139,0.48)" }}
              >
                demo
              </span>
            ) : null}
          </div>
        </div>
      ))}

      {isThinking ? (
        <div className="flex gap-2 px-4">
          <AssistantIcon />
          <div
            className="rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(203,213,225,0.72)",
              maxWidth: "88%",
            }}
          >
            Analysoidaan...
          </div>
        </div>
      ) : null}

      <div ref={messagesEndRef} />
    </div>
  );
}

function AssistantComposer({
  disabled,
  onChange,
  onSubmit,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 px-3 pb-3 pt-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Esim. Miten voisin hajauttaa salkkuani?"
          className="flex-1 bg-transparent text-xs text-white outline-none min-w-0 disabled:opacity-60"
          style={{ caretColor: "#a78bfa", color: "rgba(255,255,255,0.9)" }}
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="white" strokeWidth={2.5}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </form>
  );
}

export default function AssistantPanel({
  alerts,
  dataHealthSummary,
  externalPrompt,
  marketDataSource = "mock",
  news,
  newsSource = "mock",
  onExternalPromptHandled,
  onAgentSourceChange,
  portfolio,
  selectedCompanySnapshot = null,
  transactions = [],
  goalSettings,
  fxRates,
  rates,
  scenarioResult = null,
  watchlist,
}: {
  alerts: PriceAlert[];
  dataHealthSummary: DataHealthSummary;
  externalPrompt?: string | null;
  marketDataSource?: "api" | "mock";
  news: NewsItem[];
  newsSource?: NewsProviderSource;
  onExternalPromptHandled?: () => void;
  onAgentSourceChange?: (source: "ai" | "mock") => void;
  portfolio: Portfolio;
  selectedCompanySnapshot?: CompanySnapshot | null;
  transactions?: import("@/lib/transactions").Transaction[];
  goalSettings?: import("@/lib/goals").PortfolioGoalSettings;
  fxRates?: FXRatesResponse;
  rates?: FXRateMap;
  scenarioResult?: import("@/lib/scenarios").ScenarioResult | null;
  watchlist: Watchlist;
}) {
  const [hasLoadedStoredMessages, setHasLoadedStoredMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const agentContext = useMemo(
    () =>
      buildAgentContext(
        portfolio,
        watchlist,
        alerts,
        news,
        newsSource,
        marketDataSource,
        dataHealthSummary,
        selectedCompanySnapshot,
        transactions,
        goalSettings,
        scenarioResult,
        rates,
        fxRates
      ),
    [alerts, dataHealthSummary, fxRates, goalSettings, marketDataSource, news, newsSource, portfolio, rates, scenarioResult, selectedCompanySnapshot, transactions, watchlist]
  );
  const dailyBriefItems =
    agentContext.riskSignals.length > 0
      ? agentContext.riskSignals.map((signal) => signal.label)
      : fallbackDailyBrief;

  // Dynamic quick-suggestions: prepend a snapshot-specific suggestion when relevant
  const dynamicSuggestions = useMemo(() => {
    if (selectedCompanySnapshot) {
      const ref = selectedCompanySnapshot.name ?? selectedCompanySnapshot.symbol;
      return [
        `Selitä ${ref} lyhyesti.`,
        ...DEFAULT_SUGGESTIONS.slice(0, 4),
      ];
    }
    return DEFAULT_SUGGESTIONS;
  }, [selectedCompanySnapshot]);

  useEffect(() => {
    const storedMessages = readStoredMessages();
    if (storedMessages) {
      setMessages(storedMessages);
    }
    setHasLoadedStoredMessages(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredMessages) return;
    writeStoredMessages(messages);
  }, [hasLoadedStoredMessages, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendQuestion = useCallback(async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isThinking) return;

    const userMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: trimmedQuestion,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsThinking(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let answer: string;
    let source: "ai" | "mock" = "mock";
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, context: agentContext }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = (await response.json()) as { answer: string; source: "ai" | "mock" };
        answer = data.answer;
        source = data.source;
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[AssistantPanel] /api/agent returned", response.status, "— using mock fallback");
        }
        answer = getMockAgentResponse(trimmedQuestion, agentContext);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (process.env.NODE_ENV !== "production") {
        console.warn("[AssistantPanel] fetch failed — using mock fallback:", err instanceof Error ? err.message : String(err));
      }
      answer = getMockAgentResponse(trimmedQuestion, agentContext);
    }

    abortControllerRef.current = null;

    const assistantMessage: ChatMessage = {
      id: createMessageId("assistant"),
      role: "assistant",
      content: answer,
      source,
      createdAt: new Date().toISOString(),
    };

    onAgentSourceChange?.(source);
    setMessages((prev) => [...prev, assistantMessage]);
    setIsThinking(false);
  }, [agentContext, isThinking, onAgentSourceChange]);

  useEffect(() => {
    if (!externalPrompt) return;
    if (isThinking) return;

    void sendQuestion(externalPrompt);
    onExternalPromptHandled?.();
  }, [externalPrompt, isThinking, onExternalPromptHandled, sendQuestion]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(inputValue);
  }

  function handleClearChat() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setInputValue("");
    setIsThinking(false);
    setMessages(initialMessages);
    writeStoredMessages(initialMessages);
  }

  return (
    <div
      className="relative flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #121030 0%, #0e1d3a 55%, #091525 100%)",
        border: "1px solid rgba(139,92,246,0.16)",
        boxShadow: "0 4px 32px rgba(79,70,229,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 5%, rgba(139,92,246,0.4) 50%, transparent 95%)",
        }}
      />
      <AssistantHeader onClear={handleClearChat} />
      <ContextBadge
        overallStatus={dataHealthSummary.overallStatus}
        snapshotSymbol={selectedCompanySnapshot?.symbol}
      />
      <AssistantMessages
        dailyBriefItems={dailyBriefItems}
        isThinking={isThinking}
        messages={messages}
        messagesEndRef={messagesEndRef}
        onSuggestion={sendQuestion}
        suggestionItems={dynamicSuggestions}
      />
      <AssistantComposer
        disabled={isThinking}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
