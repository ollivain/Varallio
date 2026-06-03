import type { NewsItem, NewsSentiment } from "./types";

const MARKETAUX_NEWS_URL = "https://api.marketaux.com/v1/news/all";
const SENTIMENT_POSITIVE_THRESHOLD = 0.1;
const SENTIMENT_NEGATIVE_THRESHOLD = -0.1;

interface MarketauxEntity {
  symbol?: string;
  sentiment_score?: number;
}

interface MarketauxArticle {
  uuid?: string;
  title?: string;
  description?: string;
  snippet?: string;
  url?: string;
  image_url?: string;
  source?: string;
  published_at?: string;
  entities?: MarketauxEntity[];
}

interface MarketauxResponse {
  data?: MarketauxArticle[];
  error?: {
    code?: string;
    message?: string;
  };
}

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function cleanTickers(tickers: string[]): string[] {
  return [...new Set(tickers.map(normalizeTicker).filter(Boolean))];
}

function toSentiment(score: number | undefined): NewsSentiment {
  if (score === undefined || !Number.isFinite(score)) return "neutral";
  if (score >= SENTIMENT_POSITIVE_THRESHOLD) return "positive";
  if (score <= SENTIMENT_NEGATIVE_THRESHOLD) return "negative";
  return "neutral";
}

function averageSentimentScore(entities: MarketauxEntity[] | undefined): number | undefined {
  const scores = (entities ?? [])
    .map((entity) => entity.sentiment_score)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

  if (scores.length === 0) return undefined;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function toIsoDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function getArticleTickers(
  article: MarketauxArticle,
  requestedTickers: Set<string>
): string[] | undefined {
  const entityTickers = (article.entities ?? [])
    .map((entity) => (entity.symbol ? normalizeTicker(entity.symbol) : ""))
    .filter(Boolean);
  const unique = [...new Set(entityTickers)];

  if (unique.length > 0) {
    return unique;
  }

  return requestedTickers.size > 0 ? [...requestedTickers] : undefined;
}

function normalizeArticle(
  article: MarketauxArticle,
  requestedTickers: Set<string>,
  index: number
): NewsItem | null {
  const title = article.title?.trim();
  if (!title) return null;

  const now = new Date().toISOString();
  const publishedAt = toIsoDate(article.published_at, now);
  const sentimentScore = averageSentimentScore(article.entities);

  return {
    id: article.uuid ?? article.url ?? `marketaux-news-${index}-${Date.now()}`,
    title,
    source: article.source?.trim() || "Marketaux",
    publishedAt,
    tickers: getArticleTickers(article, requestedTickers),
    summary: article.description?.trim() || article.snippet?.trim() || undefined,
    url: article.url,
    sentiment: toSentiment(sentimentScore),
    imageUrl: article.image_url,
    createdAt: now,
    updatedAt: now,
  };
}

export async function fetchMarketauxNews(
  tickers: string[],
  apiKey: string
): Promise<NewsItem[]> {
  const cleanedTickers = cleanTickers(tickers);
  const requestedTickers = new Set(cleanedTickers);
  const params = new URLSearchParams({
    api_token: apiKey,
    filter_entities: "true",
    language: "en",
    limit: "10",
  });

  if (cleanedTickers.length > 0) {
    params.set("symbols", cleanedTickers.join(","));
  }

  const response = await fetch(`${MARKETAUX_NEWS_URL}?${params.toString()}`, {
    headers: { "User-Agent": "InvestmentOS/1.0" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Marketaux API error: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Marketaux returned an unexpected response shape");
  }

  const body = data as MarketauxResponse;
  if (body.error) {
    throw new Error(body.error.message ?? body.error.code ?? "Marketaux returned an error");
  }

  if (!Array.isArray(body.data)) {
    throw new Error("Marketaux response did not include a data array");
  }

  return body.data
    .map((article, index) => normalizeArticle(article, requestedTickers, index))
    .filter((item): item is NewsItem => item !== null);
}
