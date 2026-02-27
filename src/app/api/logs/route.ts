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

    // Run count + data queries in parallel — they share the same WHERE clause
    // but have zero data dependency. Cuts route latency ~50%.
    const [countResult, records] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(logRecords)
        .where(whereClause)
        .then((rows) => rows[0]),
      db
        .select()
        .from(logRecords)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(query.pageSize)
        .offset(offset),
    ]);

    const total = countResult?.count ?? 0;
    const data = records.map(transformToApiFormat);

    return success({
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
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
