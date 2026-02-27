import { asc, desc, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  buildFilterConditions,
  Errors,
  handleError,
  logsQuerySchema,
  requireAuth,
  requireFileReady,
  searchParamsToObject,
  success,
  validateSchema,
} from "@/lib/api";
import { db, logRecords } from "@/lib/db";
import type { LogRecord as DbLogRecord } from "@/lib/db/schema";

/** Max rows to scan for non-timestamp sorts. Prevents full-table heap fetches on Neon cold storage. */
const SORT_SCAN_CAP = 5000;

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const params = searchParamsToObject(request.nextUrl.searchParams);
    const query = validateSchema(logsQuerySchema, params);
    const { file, fileId } = await requireFileReady(query.fileKey);

    // Ownership check
    if (user.role !== "admin" && file.userId !== user.id) {
      throw Errors.notFound("File");
    }

    const whereClause = buildFilterConditions(fileId, query);

    const sortColumn =
      {
        timestamp: logRecords.timestamp,
        duration: logRecords.duration,
        status: logRecords.status,
        method: logRecords.method,
        endpoint: logRecords.endpoint,
        responseSize: logRecords.responseSize,
      }[query.sortBy] ?? logRecords.timestamp;

    const orderByClause =
      query.sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    const offset = (query.page - 1) * query.pageSize;
    const fetchLimit = query.pageSize + 1;

    let records: (typeof logRecords.$inferSelect)[];

    if (query.sortBy === "timestamp") {
      // Fast path: idx_file_timestamp aligns filter prefix + sort order.
      // Postgres scans the index in order and stops after LIMIT rows.
      records = await db
        .select()
        .from(logRecords)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(fetchLimit)
        .offset(offset);
    } else {
      // Non-timestamp sorts: Postgres must heap-fetch ALL matching rows to sort,
      // which is catastrophic on Neon cold storage (30-45s for 30K rows).
      // Fix: cap the scan to recent rows via the fast timestamp index, then
      // re-sort in-memory. Trade-off: sort is within the most recent SORT_SCAN_CAP
      // matching rows, which is correct for typical log analysis.
      const filtered = db
        .select()
        .from(logRecords)
        .where(whereClause)
        .orderBy(desc(logRecords.timestamp))
        .limit(SORT_SCAN_CAP)
        .as("filtered");

      const filteredSortCol =
        {
          duration: filtered.duration,
          status: filtered.status,
          method: filtered.method,
          endpoint: filtered.endpoint,
          responseSize: filtered.responseSize,
        }[query.sortBy] ?? filtered.timestamp;

      records = await db
        .select()
        .from(filtered)
        .orderBy(query.sortDir === "asc" ? asc(filteredSortCol) : desc(filteredSortCol))
        .limit(fetchLimit)
        .offset(offset);
    }

    const hasMore = records.length > query.pageSize;
    const page = records.slice(0, query.pageSize);
    const data = page.map(transformToApiFormat);

    return success({
      data,
      page: query.page,
      pageSize: query.pageSize,
      hasMore,
    });
  } catch (error) {
    return handleError(error, "Failed to fetch logs");
  }
}

function transformToApiFormat(record: DbLogRecord) {
  let tags: string[] = [];
  if (record.tags) {
    try {
      tags = JSON.parse(record.tags);
    } catch {
      tags = [];
    }
  }

  return {
    timestamp: record.timestamp.toISOString(),
    traceId: record.traceId ?? "",
    spanId: record.spanId ?? "",
    severityText: record.severityText ?? "INFO",
    severityNumber: record.severityNumber ?? 9,
    body: {
      duration: record.duration ?? 0,
      insertId: record.insertId ?? "",
      method: record.method ?? "",
      referer: record.referer ?? "",
      remoteIp: record.remoteIp ?? "",
      requestSize: record.requestSize ?? 0,
      responseSize: record.responseSize ?? 0,
      status: record.status ?? 0,
      url: record.url ?? "",
      userAgent: record.userAgent ?? "",
    },
    attributes: {
      sanity: {
        projectId: record.projectId ?? "",
        dataset: record.dataset ?? "",
        domain: record.domain ?? "",
        endpoint: record.endpoint ?? "",
        groqQueryIdentifier: record.groqQueryId ?? "",
        apiVersion: record.apiVersion ?? "",
        tags,
        studioRequest: record.isStudioRequest === 1,
      },
    },
    resource: {
      service: {
        name: record.resourceServiceName ?? "Sanity.io",
      },
      sanity: {
        type: record.resourceSanityType ?? "http_request",
        version: record.resourceSanityVersion ?? "0.0.1",
      },
    },
  };
}
