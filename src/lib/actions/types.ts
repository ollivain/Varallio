export type ActionSuggestionType =
  | "review"
  | "monitor"
  | "compare"
  | "ask_agent"
  | "update_data";

export type ActionSuggestionPriority = "high" | "medium" | "low";

export type ActionSuggestionSource =
  | "portfolio_insight"
  | "news_intelligence"
  | "alert"
  | "watchlist"
  | "watchlist_research"
  | "data_freshness";

export interface ActionSuggestion {
  id: string;
  title: string;
  description: string;
  type: ActionSuggestionType;
  priority: ActionSuggestionPriority;
  source: ActionSuggestionSource;
  relatedSymbols?: string[];
  suggestedPrompt?: string;
  ctaLabel?: string;
}
