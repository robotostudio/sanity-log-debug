export interface LogRecord {
  timestamp: string;
  traceId: string;
  spanId: string;
  severityText: "INFO" | "WARN" | "ERROR";
  severityNumber: number;
  body: {
    duration: number;
    insertId: string;
    method: string;
    referer: string;
    remoteIp: string;
    requestSize: number;
    responseSize: number;
    status: number;
    url: string;
    userAgent: string;
  };
  attributes: {
    sanity: {
      projectId: string;
      dataset: string;
      domain: string;
      endpoint: string;
      groqQueryIdentifier: string;
      apiVersion: string;
      tags: string[];
      studioRequest: boolean;
    };
  };
  resource: {
    service: { name: string };
    sanity: { type: string; version: string };
  };
}

export interface Filters {
  dateFrom?: string;
  dateTo?: string;
  severity?: string[];
  method?: string[];
  status?: string[];
  endpoint?: string[];
  domain?: string[];
  studio?: "true" | "false" | "all";
  apiVersion?: string[];
  search?: string;
  groqId?: string;
}

export interface KpiData {
  totalRequests: number;
  avgDuration: number;
  errorRate: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  requestsPerHour: number;
}

export interface TimeSeriesBucket {
  hour: string;
  info: number;
  warn: number;
  error: number;
  avgDuration: number;
}

export interface DistributionItem {
  name: string;
  count: number;
  avgDuration?: number;
}

export interface Aggregations {
  kpis: KpiData;
  timeSeries: TimeSeriesBucket[];
  statusDistribution: DistributionItem[];
  endpointDistribution: DistributionItem[];
  domainDistribution: DistributionItem[];
  methodDistribution: DistributionItem[];
  latencyBuckets: DistributionItem[];
  topSlowRequests: {
    traceId: string;
    url: string;
    duration: number;
    method: string;
    status: number;
    endpoint: string;
    timestamp: string;
  }[];
  queryExplorer: {
    groqId: string;
    count: number;
    avgDuration: number;
    p99Duration: number;
    endpoint: string;
  }[];
  totalFiltered: number;
}
