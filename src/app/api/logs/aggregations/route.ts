import { avg, count, desc, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  aggregationsQuerySchema,
  buildFilterConditions,
  Errors,
  handleError,
  requireAuth,
  requireFileReady,
  searchParamsToObject,
  success,
  type ValidatedFilters,
  validateSchema,
} from "@/lib/api";
import { LATENCY_BUCKETS } from "@/lib/constants";
import { db, logRecords } from "@/lib/db";
import type {
  Aggregations,
  DistributionItem,
  KpiData,
  TimeSeriesBucket,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const params = searchParamsToObject(request.nextUrl.searchParams);
    const query = validateSchema(aggregationsQuerySchema, params);
    const { file, fileId } = await requireFileReady(query.fileKey);

    if (user.role !== "admin" && file.userId !== user.id) {
      throw Errors.notFound("File");
    }

    const aggregations = await getSqlAggregations(fileId, query);
    return success(aggregations);
  } catch (error) {
    return handleError(error, "Failed to fetch aggregations");
  }
}

async function getSqlAggregations(
  fileId: string,
  filters: ValidatedFilters,
): Promise<Aggregations> {
  const AGG_SCAN_CAP = 10_000;
  const whereClause = buildFilterConditions(fileId, filters);

  // Cap to most recent N rows — all aggregations run against this subset
  const capped = db
    .select()
    .from(logRecords)
    .where(whereClause)
    .orderBy(desc(logRecords.timestamp))
    .limit(AGG_SCAN_CAP)
    .as("capped");

  const [
    kpisResult,
    timeSeriesResult,
    statusResult,
    endpointResult,
    domainResult,
    methodResult,
    slowRequestsResult,
    queryExplorerResult,
    percentilesResult,
    latencyBucketsResult,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        avgDuration: avg(capped.duration),
        errorCount: sql<number>`SUM(CASE WHEN ${capped.status} >= 400 OR ${capped.status} = 0 THEN 1 ELSE 0 END)`,
        minTimestamp: sql<Date>`MIN(${capped.timestamp})`,
        maxTimestamp: sql<Date>`MAX(${capped.timestamp})`,
      })
      .from(capped),

    db
      .select({
        hour: sql<string>`date_trunc('hour', ${capped.timestamp})::text`,
        severity: capped.severityText,
        count: count(),
        avgDuration: avg(capped.duration),
      })
      .from(capped)
      .groupBy(
        sql`date_trunc('hour', ${capped.timestamp})`,
        capped.severityText,
      )
      .orderBy(sql`date_trunc('hour', ${capped.timestamp})`),

    db
      .select({
        status: capped.status,
        count: count(),
      })
      .from(capped)
      .groupBy(capped.status),

    db
      .select({
        endpoint: capped.endpoint,
        count: count(),
        avgDuration: avg(capped.duration),
      })
      .from(capped)
      .groupBy(capped.endpoint)
      .orderBy(sql`count(*) DESC`)
      .limit(15),

    db
      .select({
        domain: capped.domain,
        count: count(),
      })
      .from(capped)
      .groupBy(capped.domain)
      .orderBy(sql`count(*) DESC`),

    db
      .select({
        method: capped.method,
        count: count(),
      })
      .from(capped)
      .groupBy(capped.method)
      .orderBy(sql`count(*) DESC`),

    db
      .select({
        traceId: capped.traceId,
        url: capped.url,
        duration: capped.duration,
        method: capped.method,
        status: capped.status,
        endpoint: capped.endpoint,
        timestamp: capped.timestamp,
      })
      .from(capped)
      .orderBy(sql`${capped.duration} DESC`)
      .limit(20),

    db
      .select({
        groqId: capped.groqQueryId,
        count: count(),
        avgDuration: avg(capped.duration),
        endpoint: sql<string>`MAX(${capped.endpoint})`,
      })
      .from(capped)
      .where(sql`${capped.groqQueryId} IS NOT NULL`)
      .groupBy(capped.groqQueryId)
      .orderBy(sql`count(*) DESC`)
      .limit(100),

    db
      .select({
        p50: sql<number>`PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${capped.duration})`,
        p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${capped.duration})`,
        p99: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${capped.duration})`,
      })
      .from(capped),

    db
      .select({
        bucket: sql<string>`CASE
          WHEN ${capped.duration} < 100 THEN '< 100ms'
          WHEN ${capped.duration} < 500 THEN '100-500ms'
          WHEN ${capped.duration} < 1000 THEN '500ms-1s'
          WHEN ${capped.duration} < 2000 THEN '1-2s'
          WHEN ${capped.duration} < 5000 THEN '2-5s'
          ELSE '> 5s'
        END`,
        sortOrder: sql<number>`CASE
          WHEN ${capped.duration} < 100 THEN 1
          WHEN ${capped.duration} < 500 THEN 2
          WHEN ${capped.duration} < 1000 THEN 3
          WHEN ${capped.duration} < 2000 THEN 4
          WHEN ${capped.duration} < 5000 THEN 5
          ELSE 6
        END`,
        count: count(),
      })
      .from(capped)
      .groupBy(
        sql`CASE
          WHEN ${capped.duration} < 100 THEN '< 100ms'
          WHEN ${capped.duration} < 500 THEN '100-500ms'
          WHEN ${capped.duration} < 1000 THEN '500ms-1s'
          WHEN ${capped.duration} < 2000 THEN '1-2s'
          WHEN ${capped.duration} < 5000 THEN '2-5s'
          ELSE '> 5s'
        END`,
        sql`CASE
          WHEN ${capped.duration} < 100 THEN 1
          WHEN ${capped.duration} < 500 THEN 2
          WHEN ${capped.duration} < 1000 THEN 3
          WHEN ${capped.duration} < 2000 THEN 4
          WHEN ${capped.duration} < 5000 THEN 5
          ELSE 6
        END`,
      )
      .orderBy(sql`2`),
  ]);

  const kpiRow = kpisResult[0];
  const total = Number(kpiRow?.total ?? 0);

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

  const percentiles = percentilesResult[0];

  const minTime = kpiRow?.minTimestamp
    ? new Date(kpiRow.minTimestamp).getTime()
    : Date.now();
  const maxTime = kpiRow?.maxTimestamp
    ? new Date(kpiRow.maxTimestamp).getTime()
    : Date.now();
  const hourSpan = Math.max(1, (maxTime - minTime) / (1000 * 60 * 60));

  const kpis: KpiData = {
    totalRequests: total,
    avgDuration: Number(kpiRow?.avgDuration ?? 0),
    errorRate: (Number(kpiRow?.errorCount ?? 0) / total) * 100,
    p50Latency: Number(percentiles?.p50 ?? 0),
    p95Latency: Number(percentiles?.p95 ?? 0),
    p99Latency: Number(percentiles?.p99 ?? 0),
    requestsPerHour: total / hourSpan,
  };

  const hourMap = new Map<
    string,
    TimeSeriesBucket & { totalCount: number; totalDuration: number }
  >();
  for (const row of timeSeriesResult) {
    const hourKey = row.hour;
    let bucket = hourMap.get(hourKey);
    if (!bucket) {
      bucket = {
        hour: hourKey,
        info: 0,
        warn: 0,
        error: 0,
        avgDuration: 0,
        totalCount: 0,
        totalDuration: 0,
      };
      hourMap.set(hourKey, bucket);
    }
    const rowCount = Number(row.count);
    const rowAvgDuration = Number(row.avgDuration ?? 0);

    if (row.severity === "INFO") bucket.info = rowCount;
    else if (row.severity === "WARN") bucket.warn = rowCount;
    else bucket.error = rowCount;

    bucket.totalCount += rowCount;
    bucket.totalDuration += rowAvgDuration * rowCount;
  }

  const timeSeries: TimeSeriesBucket[] = Array.from(hourMap.values())
    .map((bucket) => ({
      hour: bucket.hour,
      info: bucket.info,
      warn: bucket.warn,
      error: bucket.error,
      avgDuration:
        bucket.totalCount > 0 ? bucket.totalDuration / bucket.totalCount : 0,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const statusDistribution: DistributionItem[] = statusResult.map((row) => ({
    name: String(row.status),
    count: Number(row.count),
  }));

  const endpointDistribution: DistributionItem[] = endpointResult.map(
    (row) => ({
      name: row.endpoint || "(empty)",
      count: Number(row.count),
      avgDuration: Number(row.avgDuration ?? 0),
    }),
  );

  const domainDistribution: DistributionItem[] = domainResult.map((row) => ({
    name: row.domain || "(empty)",
    count: Number(row.count),
  }));

  const methodDistribution: DistributionItem[] = methodResult.map((row) => ({
    name: row.method || "(empty)",
    count: Number(row.count),
  }));

  const latencyBuckets: DistributionItem[] = LATENCY_BUCKETS.map((b) => ({
    name: b.label,
    count: 0,
  }));

  for (const row of latencyBucketsResult) {
    const idx = latencyBuckets.findIndex((b) => b.name === row.bucket);
    if (idx >= 0) {
      latencyBuckets[idx].count = Number(row.count);
    }
  }

  const topSlowRequests = slowRequestsResult.map((row) => ({
    traceId: row.traceId || "",
    url: row.url || "",
    duration: Number(row.duration ?? 0),
    method: row.method || "",
    status: Number(row.status ?? 0),
    endpoint: row.endpoint || "",
    timestamp: row.timestamp?.toISOString() || "",
  }));

  const queryExplorer = queryExplorerResult.map((row) => ({
    groqId: row.groqId || "",
    count: Number(row.count),
    avgDuration: Number(row.avgDuration ?? 0),
    p99Duration: 0,
    endpoint: row.endpoint || "",
  }));

  return {
    kpis,
    timeSeries,
    statusDistribution,
    endpointDistribution,
    domainDistribution,
    methodDistribution,
    latencyBuckets,
    topSlowRequests,
    queryExplorer,
    totalFiltered: total,
  };
}
