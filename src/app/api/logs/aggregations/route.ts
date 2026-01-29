import { and, avg, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { LATENCY_BUCKETS } from "@/lib/constants";
import { parseFiltersFromParams } from "@/lib/data";
import { isValidUrlDate, parseDateFromUrl } from "@/lib/date-utils";
import { db, files, logRecords } from "@/lib/db";
import type {
  Aggregations,
  DistributionItem,
  KpiData,
  TimeSeriesBucket,
} from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = parseFiltersFromParams(params);
  const fileKey = params.get("fileKey");

  if (!fileKey) {
    return NextResponse.json({ error: "fileKey is required" }, { status: 400 });
  }

  // Get the file from database
  const dbFile = await db.query.files.findFirst({
    where: eq(files.key, fileKey),
  });

  if (!dbFile) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (dbFile.processingStatus !== "ready") {
    return NextResponse.json(
      { error: "File is still processing", status: dbFile.processingStatus },
      { status: 202 },
    );
  }

  // Use SQL-based aggregations
  const aggregations = await getSqlAggregations(dbFile.id, filters);
  return NextResponse.json(aggregations);
}

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  severity?: string[];
  method?: string[];
  status?: string[];
  endpoint?: string[];
  domain?: string[];
  studio?: "true" | "false" | "all";
}

async function getSqlAggregations(
  fileId: string,
  filters: Filters,
): Promise<Aggregations> {
  // Build where conditions
  const conditions = [eq(logRecords.fileId, fileId)];

  if (filters.dateFrom) {
    const dateFromIso = isValidUrlDate(filters.dateFrom)
      ? parseDateFromUrl(filters.dateFrom, "start")
      : filters.dateFrom;
    if (dateFromIso) {
      conditions.push(gte(logRecords.timestamp, new Date(dateFromIso)));
    }
  }

  if (filters.dateTo) {
    const dateToIso = isValidUrlDate(filters.dateTo)
      ? parseDateFromUrl(filters.dateTo, "end")
      : filters.dateTo;
    if (dateToIso) {
      conditions.push(lte(logRecords.timestamp, new Date(dateToIso)));
    }
  }

  if (filters.severity?.length) {
    conditions.push(inArray(logRecords.severityText, filters.severity));
  }

  if (filters.method?.length) {
    conditions.push(inArray(logRecords.method, filters.method));
  }

  if (filters.status?.length) {
    conditions.push(
      inArray(
        logRecords.status,
        filters.status.map((s) => Number.parseInt(s, 10)),
      ),
    );
  }

  if (filters.endpoint?.length) {
    conditions.push(inArray(logRecords.endpoint, filters.endpoint));
  }

  if (filters.domain?.length) {
    conditions.push(inArray(logRecords.domain, filters.domain));
  }

  if (filters.studio === "true") {
    conditions.push(eq(logRecords.isStudioRequest, 1));
  } else if (filters.studio === "false") {
    conditions.push(eq(logRecords.isStudioRequest, 0));
  }

  const whereClause = and(...conditions);

  // Execute queries in parallel
  const [
    kpisResult,
    timeSeriesResult,
    statusResult,
    endpointResult,
    domainResult,
    methodResult,
    slowRequestsResult,
    queryExplorerResult,
  ] = await Promise.all([
    // KPIs
    db
      .select({
        total: count(),
        avgDuration: avg(logRecords.duration),
        errorCount: sql<number>`SUM(CASE WHEN ${logRecords.status} >= 400 OR ${logRecords.status} = 0 THEN 1 ELSE 0 END)`,
        minTimestamp: sql<Date>`MIN(${logRecords.timestamp})`,
        maxTimestamp: sql<Date>`MAX(${logRecords.timestamp})`,
      })
      .from(logRecords)
      .where(whereClause),

    // Time series (hourly)
    db
      .select({
        hour: sql<string>`date_trunc('hour', ${logRecords.timestamp})::text`,
        severity: logRecords.severityText,
        count: count(),
        avgDuration: avg(logRecords.duration),
      })
      .from(logRecords)
      .where(whereClause)
      .groupBy(
        sql`date_trunc('hour', ${logRecords.timestamp})`,
        logRecords.severityText,
      )
      .orderBy(sql`date_trunc('hour', ${logRecords.timestamp})`),

    // Status distribution
    db
      .select({
        status: logRecords.status,
        count: count(),
      })
      .from(logRecords)
      .where(whereClause)
      .groupBy(logRecords.status),

    // Endpoint distribution
    db
      .select({
        endpoint: logRecords.endpoint,
        count: count(),
        avgDuration: avg(logRecords.duration),
      })
      .from(logRecords)
      .where(whereClause)
      .groupBy(logRecords.endpoint)
      .orderBy(sql`count(*) DESC`)
      .limit(15),

    // Domain distribution
    db
      .select({
        domain: logRecords.domain,
        count: count(),
      })
      .from(logRecords)
      .where(whereClause)
      .groupBy(logRecords.domain)
      .orderBy(sql`count(*) DESC`),

    // Method distribution
    db
      .select({
        method: logRecords.method,
        count: count(),
      })
      .from(logRecords)
      .where(whereClause)
      .groupBy(logRecords.method)
      .orderBy(sql`count(*) DESC`),

    // Top slow requests
    db
      .select({
        traceId: logRecords.traceId,
        url: logRecords.url,
        duration: logRecords.duration,
        method: logRecords.method,
        status: logRecords.status,
        endpoint: logRecords.endpoint,
        timestamp: logRecords.timestamp,
      })
      .from(logRecords)
      .where(whereClause)
      .orderBy(sql`${logRecords.duration} DESC`)
      .limit(20),

    // Query explorer (GROQ query stats)
    db
      .select({
        groqId: logRecords.groqQueryId,
        count: count(),
        avgDuration: avg(logRecords.duration),
        endpoint: sql<string>`MAX(${logRecords.endpoint})`,
      })
      .from(logRecords)
      .where(and(whereClause, sql`${logRecords.groqQueryId} IS NOT NULL`))
      .groupBy(logRecords.groqQueryId)
      .orderBy(sql`count(*) DESC`)
      .limit(100),
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

  // Calculate percentiles with filters applied (PostgreSQL percentile_cont)
  const percentilesResult = await db
    .select({
      p50: sql<number>`PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${logRecords.duration})`,
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${logRecords.duration})`,
      p99: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${logRecords.duration})`,
    })
    .from(logRecords)
    .where(whereClause);

  const percentiles = percentilesResult[0];

  // Calculate hour span
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

  // Process time series into expected format with weighted average
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

    // Accumulate for weighted average calculation
    bucket.totalCount += rowCount;
    bucket.totalDuration += rowAvgDuration * rowCount;
  }

  // Calculate weighted average for each hour bucket
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

  // Latency buckets with filters applied
  const latencyBucketsResult = await db
    .select({
      bucket: sql<string>`CASE
        WHEN ${logRecords.duration} < 100 THEN '< 100ms'
        WHEN ${logRecords.duration} < 500 THEN '100-500ms'
        WHEN ${logRecords.duration} < 1000 THEN '500ms-1s'
        WHEN ${logRecords.duration} < 2000 THEN '1-2s'
        WHEN ${logRecords.duration} < 5000 THEN '2-5s'
        ELSE '> 5s'
      END`,
      sortOrder: sql<number>`CASE
        WHEN ${logRecords.duration} < 100 THEN 1
        WHEN ${logRecords.duration} < 500 THEN 2
        WHEN ${logRecords.duration} < 1000 THEN 3
        WHEN ${logRecords.duration} < 2000 THEN 4
        WHEN ${logRecords.duration} < 5000 THEN 5
        ELSE 6
      END`,
      count: count(),
    })
    .from(logRecords)
    .where(whereClause)
    .groupBy(
      sql`CASE
        WHEN ${logRecords.duration} < 100 THEN '< 100ms'
        WHEN ${logRecords.duration} < 500 THEN '100-500ms'
        WHEN ${logRecords.duration} < 1000 THEN '500ms-1s'
        WHEN ${logRecords.duration} < 2000 THEN '1-2s'
        WHEN ${logRecords.duration} < 5000 THEN '2-5s'
        ELSE '> 5s'
      END`,
      sql`CASE
        WHEN ${logRecords.duration} < 100 THEN 1
        WHEN ${logRecords.duration} < 500 THEN 2
        WHEN ${logRecords.duration} < 1000 THEN 3
        WHEN ${logRecords.duration} < 2000 THEN 4
        WHEN ${logRecords.duration} < 5000 THEN 5
        ELSE 6
      END`,
    )
    .orderBy(sql`2`);

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
    p99Duration: 0, // Would need separate query for this
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
