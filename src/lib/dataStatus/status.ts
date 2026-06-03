import type {
  DataFreshnessStatus,
  DataHealthOverallStatus,
  DataHealthSummary,
  DataSourceKey,
  DataSourceKind,
  DataSourceStatus,
} from "./types";

const MARKET_FRESH_HOURS = 0.5;
const MARKET_STALE_HOURS = 2;
const NEWS_FRESH_HOURS = 6;
const NEWS_STALE_HOURS = 24;
const AGENT_STALE_HOURS = 24;
const FX_FRESH_HOURS = 24;
const FX_STALE_HOURS = 72;

const LABELS: Record<DataSourceKey, string> = {
  agent: "Agent",
  fx: "FX rates",
  market: "Market data",
  news: "News data",
};

function getAgeHours(lastUpdated: string | undefined, now: Date): number | undefined {
  if (!lastUpdated) return undefined;

  const date = new Date(lastUpdated);
  const ageMs = now.getTime() - date.getTime();
  if (!Number.isFinite(ageMs) || Number.isNaN(date.getTime()) || ageMs < 0) return undefined;

  return ageMs / (1000 * 60 * 60);
}

function buildMessage({
  ageHours,
  freshHours,
  key,
  source,
  staleHours,
  status,
}: {
  ageHours?: number;
  freshHours: number;
  key: DataSourceKey;
  source: DataSourceKind;
  staleHours: number;
  status: DataFreshnessStatus;
}): string {
  if (source === "static") {
    return `${LABELS[key]} uses static fallback rates.`;
  }

  if (source === "mock" || source === "fallback") {
    return `${LABELS[key]} uses ${source} data.`;
  }

  if (source === "unknown") {
    return `${LABELS[key]} source is not known yet.`;
  }

  if (status === "fresh") {
    return ageHours === undefined
      ? `${LABELS[key]} is live.`
      : `${LABELS[key]} refreshed recently.`;
  }

  if (status === "stale") {
    return `${LABELS[key]} is live but older than ${staleHours}h.`;
  }

  return `${LABELS[key]} has not been refreshed yet.`;
}

function buildSourceStatus({
  freshHours,
  key,
  lastUpdated,
  now,
  source,
  staleHours,
}: {
  freshHours: number;
  key: DataSourceKey;
  lastUpdated?: string;
  now: Date;
  source: DataSourceKind;
  staleHours: number;
}): DataSourceStatus {
  const ageHours = getAgeHours(lastUpdated, now);
  let status: DataFreshnessStatus = "unknown";

  if (source === "static") {
    status = "static";
  } else if (source === "mock" || source === "fallback") {
    status = "mock";
  } else if (source === "live") {
    if (ageHours === undefined) {
      status = "unknown";
    } else if (ageHours <= freshHours) {
      status = "fresh";
    } else if (ageHours >= staleHours) {
      status = "stale";
    } else {
      status = "fresh";
    }
  }

  return {
    key,
    label: LABELS[key],
    source,
    lastUpdated,
    status,
    message: buildMessage({ ageHours, freshHours, key, source, staleHours, status }),
  };
}

function calculateOverallStatus(items: DataSourceStatus[]): DataHealthOverallStatus {
  const market = items.find((item) => item.key === "market");
  const news = items.find((item) => item.key === "news");
  const fx = items.find((item) => item.key === "fx");
  const coreItems = [market, news, fx].filter((item): item is DataSourceStatus => Boolean(item));

  if (coreItems.length === 0) return "unknown";

  const mockCount = coreItems.filter((item) => item.status === "mock" || item.status === "static").length;
  const staleCount = coreItems.filter((item) => item.status === "stale").length;
  const unknownCount = coreItems.filter((item) => item.status === "unknown").length;

  if (mockCount === coreItems.length) return "mock";
  if (staleCount > 0) return "stale";
  if (mockCount > 0 || unknownCount > 0) return "partial";
  return "healthy";
}

export function buildDataHealthSummary({
  agentLastUpdated,
  agentSource = "unknown",
  fxLastUpdated,
  fxSource = "unknown",
  marketLastUpdated,
  marketSource = "unknown",
  newsLastUpdated,
  newsSource = "unknown",
  now = new Date(),
}: {
  agentLastUpdated?: string;
  agentSource?: DataSourceKind;
  fxLastUpdated?: string;
  fxSource?: DataSourceKind;
  marketLastUpdated?: string;
  marketSource?: DataSourceKind;
  newsLastUpdated?: string;
  newsSource?: DataSourceKind;
  now?: Date;
}): DataHealthSummary {
  const items = [
    buildSourceStatus({
      freshHours: MARKET_FRESH_HOURS,
      key: "market",
      lastUpdated: marketLastUpdated,
      now,
      source: marketSource,
      staleHours: MARKET_STALE_HOURS,
    }),
    buildSourceStatus({
      freshHours: NEWS_FRESH_HOURS,
      key: "news",
      lastUpdated: newsLastUpdated,
      now,
      source: newsSource,
      staleHours: NEWS_STALE_HOURS,
    }),
    buildSourceStatus({
      freshHours: FX_FRESH_HOURS,
      key: "fx",
      lastUpdated: fxLastUpdated,
      now,
      source: fxSource,
      staleHours: FX_STALE_HOURS,
    }),
    buildSourceStatus({
      freshHours: AGENT_STALE_HOURS,
      key: "agent",
      lastUpdated: agentLastUpdated,
      now,
      source: agentSource,
      staleHours: AGENT_STALE_HOURS,
    }),
  ];
  const overallStatus = calculateOverallStatus(items);
  const warnings = items
    .filter(
      (item) =>
        item.status === "mock" ||
        item.status === "static" ||
        item.status === "stale" ||
        item.status === "unknown"
    )
    .map((item) => item.message);

  return {
    overallStatus,
    items,
    warnings,
  };
}
