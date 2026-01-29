import { LATENCY_BUCKETS } from "./constants";
import { getFileContent, listFiles } from "./r2";
import type {
  Aggregations,
  DistributionItem,
  Filters,
  KpiData,
  LogRecord,
  TimeSeriesBucket,
} from "./types";

// Cache with file key tracking
let cachedRecords: LogRecord[] | null = null;
let cachedFileKey: string | null = null;

export async function loadRecords(fileKey?: string): Promise<LogRecord[]> {
  // If a specific file is requested and it's different from cached, reload
  if (fileKey && fileKey !== cachedFileKey) {
    cachedRecords = null;
    cachedFileKey = null;
  }

  if (cachedRecords) return cachedRecords;

  // If no specific file requested, use the most recent one
  let targetKey = fileKey;
  if (!targetKey) {
    const files = await listFiles();
    if (files.length === 0) {
      return [];
    }
    // Sort by lastModified descending and pick the most recent
    files.sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
    );
    targetKey = files[0].key;
  }

  const content = await getFileContent(targetKey);
  const lines = content.trim().split("\n");
  cachedRecords = lines.map((line) => JSON.parse(line) as LogRecord);
  cachedFileKey = targetKey;

  return cachedRecords;
}

// Clear cache when a new file is uploaded
export function clearRecordCache(): void {
  cachedRecords = null;
  cachedFileKey = null;
}

export function getFilteredRecords(
  records: LogRecord[],
  filters: Filters,
): LogRecord[] {
  return records.filter((r) => {
    if (filters.dateFrom && r.timestamp < filters.dateFrom) return false;
    if (filters.dateTo && r.timestamp > filters.dateTo) return false;

    if (filters.severity?.length && !filters.severity.includes(r.severityText))
      return false;

    if (filters.method?.length && !filters.method.includes(r.body.method))
      return false;

    if (
      filters.status?.length &&
      !filters.status.includes(String(r.body.status))
    )
      return false;

    if (
      filters.endpoint?.length &&
      !filters.endpoint.includes(r.attributes.sanity.endpoint)
    )
      return false;

    if (
      filters.domain?.length &&
      !filters.domain.includes(r.attributes.sanity.domain)
    )
      return false;

    if (filters.studio === "true" && !r.attributes.sanity.studioRequest)
      return false;
    if (filters.studio === "false" && r.attributes.sanity.studioRequest)
      return false;

    if (
      filters.apiVersion?.length &&
      !filters.apiVersion.includes(r.attributes.sanity.apiVersion)
    )
      return false;

    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (
        !r.body.url.toLowerCase().includes(s) &&
        !r.traceId.toLowerCase().includes(s)
      )
        return false;
    }

    if (
      filters.groqId &&
      r.attributes.sanity.groqQueryIdentifier !== filters.groqId
    )
      return false;

    return true;
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function getAggregations(records: LogRecord[]): Aggregations {
  const total = records.length;
  if (total === 0) {
    return {
      kpis: {
        totalRequests: 0,
        avgDuration: 0,
        errorRate: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        requestsPerHour: 0,
      },
      timeSeries: [],
      statusDistribution: [],
      endpointDistribution: [],
      domainDistribution: [],
      methodDistribution: [],
      latencyBuckets: [],
      topSlowRequests: [],
      queryExplorer: [],
      totalFiltered: 0,
    };
  }

  const durations = records.map((r) => r.body.duration).sort((a, b) => a - b);
  const totalDuration = durations.reduce((a, b) => a + b, 0);
  const errorCount = records.filter(
    (r) => r.body.status >= 400 || r.body.status === 0,
  ).length;

  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const r of records) {
    const t = new Date(r.timestamp).getTime();
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }
  const hourSpan = Math.max(1, (maxTime - minTime) / (1000 * 60 * 60));

  const kpis: KpiData = {
    totalRequests: total,
    avgDuration: totalDuration / total,
    errorRate: (errorCount / total) * 100,
    p50Latency: percentile(durations, 50),
    p95Latency: percentile(durations, 95),
    p99Latency: percentile(durations, 99),
    requestsPerHour: total / hourSpan,
  };

  const hourMap = new Map<
    string,
    {
      info: number;
      warn: number;
      error: number;
      totalDuration: number;
      count: number;
    }
  >();

  for (const r of records) {
    const d = new Date(r.timestamp);
    const hourKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:00:00Z`;

    let bucket = hourMap.get(hourKey);
    if (!bucket) {
      bucket = { info: 0, warn: 0, error: 0, totalDuration: 0, count: 0 };
      hourMap.set(hourKey, bucket);
    }

    if (r.severityText === "INFO") bucket.info++;
    else if (r.severityText === "WARN") bucket.warn++;
    else bucket.error++;

    bucket.totalDuration += r.body.duration;
    bucket.count++;
  }

  const timeSeries: TimeSeriesBucket[] = Array.from(hourMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, b]) => ({
      hour,
      info: b.info,
      warn: b.warn,
      error: b.error,
      avgDuration: b.count > 0 ? b.totalDuration / b.count : 0,
    }));

  const statusMap = new Map<string, number>();
  for (const r of records) {
    const key = String(r.body.status);
    statusMap.set(key, (statusMap.get(key) ?? 0) + 1);
  }
  const statusDistribution: DistributionItem[] = Array.from(statusMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const endpointMap = new Map<
    string,
    { count: number; totalDuration: number }
  >();
  for (const r of records) {
    const key = r.attributes.sanity.endpoint || "(empty)";
    const entry = endpointMap.get(key) ?? { count: 0, totalDuration: 0 };
    entry.count++;
    entry.totalDuration += r.body.duration;
    endpointMap.set(key, entry);
  }
  const endpointDistribution: DistributionItem[] = Array.from(
    endpointMap.entries(),
  )
    .map(([name, e]) => ({
      name,
      count: e.count,
      avgDuration: e.totalDuration / e.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const domainMap = new Map<string, number>();
  for (const r of records) {
    const key = r.attributes.sanity.domain;
    domainMap.set(key, (domainMap.get(key) ?? 0) + 1);
  }
  const domainDistribution: DistributionItem[] = Array.from(domainMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const methodMap = new Map<string, number>();
  for (const r of records) {
    const key = r.body.method;
    methodMap.set(key, (methodMap.get(key) ?? 0) + 1);
  }
  const methodDistribution: DistributionItem[] = Array.from(methodMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const latencyBucketCounts = LATENCY_BUCKETS.map((b) => ({
    name: b.label,
    count: 0,
  }));
  for (const d of durations) {
    for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
      if (d >= LATENCY_BUCKETS[i].min && d < LATENCY_BUCKETS[i].max) {
        latencyBucketCounts[i].count++;
        break;
      }
    }
  }

  const topSlowRequests = [...records]
    .sort((a, b) => b.body.duration - a.body.duration)
    .slice(0, 20)
    .map((r) => ({
      traceId: r.traceId,
      url: r.body.url,
      duration: r.body.duration,
      method: r.body.method,
      status: r.body.status,
      endpoint: r.attributes.sanity.endpoint,
      timestamp: r.timestamp,
    }));

  const queryMap = new Map<
    string,
    { count: number; durations: number[]; endpoint: string }
  >();
  for (const r of records) {
    const groqId = r.attributes.sanity.groqQueryIdentifier;
    if (!groqId) continue;
    const entry = queryMap.get(groqId) ?? {
      count: 0,
      durations: [],
      endpoint: r.attributes.sanity.endpoint,
    };
    entry.count++;
    entry.durations.push(r.body.duration);
    queryMap.set(groqId, entry);
  }
  const queryExplorer = Array.from(queryMap.entries())
    .map(([groqId, e]) => {
      const sorted = e.durations.sort((a, b) => a - b);
      return {
        groqId,
        count: e.count,
        avgDuration:
          e.durations.reduce((a, b) => a + b, 0) / e.durations.length,
        p99Duration: percentile(sorted, 99),
        endpoint: e.endpoint,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 100);

  return {
    kpis,
    timeSeries,
    statusDistribution,
    endpointDistribution,
    domainDistribution,
    methodDistribution,
    latencyBuckets: latencyBucketCounts,
    topSlowRequests,
    queryExplorer,
    totalFiltered: total,
  };
}

export function parseFiltersFromParams(params: URLSearchParams): Filters {
  const filters: Filters = {};

  const dateFrom = params.get("dateFrom");
  if (dateFrom) filters.dateFrom = dateFrom;

  const dateTo = params.get("dateTo");
  if (dateTo) filters.dateTo = dateTo;

  const severity = params.get("severity");
  if (severity) filters.severity = severity.split(",");

  const method = params.get("method");
  if (method) filters.method = method.split(",");

  const status = params.get("status");
  if (status) filters.status = status.split(",");

  const endpoint = params.get("endpoint");
  if (endpoint) filters.endpoint = endpoint.split(",");

  const domain = params.get("domain");
  if (domain) filters.domain = domain.split(",");

  const studio = params.get("studio");
  if (studio === "true" || studio === "false") filters.studio = studio;

  const apiVersion = params.get("apiVersion");
  if (apiVersion) filters.apiVersion = apiVersion.split(",");

  const search = params.get("search");
  if (search) filters.search = search;

  const groqId = params.get("groqId");
  if (groqId) filters.groqId = groqId;

  return filters;
}
