export type DataSourceKey = "market" | "news" | "agent" | "fx";

export type DataSourceKind = "live" | "mock" | "fallback" | "static" | "unknown";

export type DataFreshnessStatus = "fresh" | "stale" | "mock" | "static" | "error" | "unknown";

export type DataHealthOverallStatus = "healthy" | "partial" | "mock" | "stale" | "unknown";

export interface DataSourceStatus {
  key: DataSourceKey;
  label: string;
  source: DataSourceKind;
  lastUpdated?: string;
  status: DataFreshnessStatus;
  message: string;
}

export interface DataHealthSummary {
  overallStatus: DataHealthOverallStatus;
  items: DataSourceStatus[];
  warnings: string[];
}

export interface DataStatusState {
  marketSource: DataSourceKind;
  newsSource: DataSourceKind;
  agentSource: DataSourceKind;
  fxSource: DataSourceKind;
  marketLastUpdated?: string;
  newsLastUpdated?: string;
  agentLastUpdated?: string;
  fxLastUpdated?: string;
}
