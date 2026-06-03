export type NewsSentiment = "positive" | "neutral" | "negative";
export type NewsPriority = "high" | "medium" | "low";

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  tickers?: string[];
  summary?: string;
  url?: string;
  sentiment?: NewsSentiment;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsRow {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  timeLabel: string;
  tickers?: string[];
  sentiment?: NewsSentiment;
  summary?: string;
  url?: string;
  imageUrl?: string;
}

export type NewsProviderSource = "live" | "mock";

export interface NewsProviderResult {
  items: NewsItem[];
  source: NewsProviderSource;
}

export interface NewsProvider {
  getNews(tickers: string[]): Promise<NewsItem[]>;
}

export interface NewsInsight extends NewsRow {
  priority: NewsPriority;
  reason: string;
  relatedHoldingValue?: number;
  relatedHoldingWeight?: number;
  isPortfolioRelated: boolean;
  isWatchlistRelated: boolean;
  affectedSymbols: string[];
  ageHours?: number;
  impactTags: string[];
}

export interface NewsIntelligenceSummary {
  highPriorityCount: number;
  negativePortfolioCount: number;
  watchlistUpdateCount: number;
}
