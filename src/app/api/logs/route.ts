import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { isValidUrlDate, parseDateFromUrl } from "@/lib/date-utils";
import { db, files, logRecords } from "@/lib/db";
import type { LogRecord as DbLogRecord } from "@/lib/db/schema";

// Pagination limits
const MIN_PAGE = 1;
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;

// Escape special characters for SQL LIKE patterns
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
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

  // Parse and validate pagination
  const rawPage = Number.parseInt(params.get("page") ?? "1", 10);
  const rawPageSize = Number.parseInt(
    params.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
    10,
  );

  // Validate pagination bounds
  const page = Number.isNaN(rawPage) || rawPage < MIN_PAGE ? MIN_PAGE : rawPage;
  const pageSize = Number.isNaN(rawPageSize)
    ? DEFAULT_PAGE_SIZE
    : Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);

  const sortBy = params.get("sortBy") ?? "timestamp";
  const sortDir = params.get("sortDir") ?? "desc";

  // Build where conditions
  const conditions = [eq(logRecords.fileId, dbFile.id)];

  // Date filters
  const dateFrom = params.get("dateFrom");
  if (dateFrom) {
    const dateFromIso = isValidUrlDate(dateFrom)
      ? parseDateFromUrl(dateFrom, "start")
      : dateFrom;
    if (dateFromIso) {
      conditions.push(gte(logRecords.timestamp, new Date(dateFromIso)));
    }
  }

  const dateTo = params.get("dateTo");
  if (dateTo) {
    const dateToIso = isValidUrlDate(dateTo)
      ? parseDateFromUrl(dateTo, "end")
      : dateTo;
    if (dateToIso) {
      conditions.push(lte(logRecords.timestamp, new Date(dateToIso)));
    }
  }

  // Severity filter
  const severity = params.get("severity");
  if (severity) {
    const severities = severity.split(",");
    conditions.push(inArray(logRecords.severityText, severities));
  }

  // Method filter
  const method = params.get("method");
  if (method) {
    const methods = method.split(",");
    conditions.push(inArray(logRecords.method, methods));
  }

  // Status filter
  const status = params.get("status");
  if (status) {
    const statuses = status.split(",").map(Number);
    conditions.push(inArray(logRecords.status, statuses));
  }

  // Endpoint filter
  const endpoint = params.get("endpoint");
  if (endpoint) {
    const endpoints = endpoint.split(",");
    conditions.push(inArray(logRecords.endpoint, endpoints));
  }

  // Domain filter
  const domain = params.get("domain");
  if (domain) {
    const domains = domain.split(",");
    conditions.push(inArray(logRecords.domain, domains));
  }

  // Studio filter
  const studio = params.get("studio");
  if (studio === "true") {
    conditions.push(eq(logRecords.isStudioRequest, 1));
  } else if (studio === "false") {
    conditions.push(eq(logRecords.isStudioRequest, 0));
  }

  // Search filter (URL or traceId) - escape special LIKE characters
  const search = params.get("search");
  if (search) {
    const escapedSearch = escapeLikePattern(search);
    const searchCondition = or(
      ilike(logRecords.url, `%${escapedSearch}%`),
      ilike(logRecords.traceId, `%${escapedSearch}%`),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // GROQ ID filter
  const groqId = params.get("groqId");
  if (groqId) {
    conditions.push(eq(logRecords.groqQueryId, groqId));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(logRecords)
    .where(whereClause);

  const total = countResult?.count ?? 0;

  // Determine sort column and direction
  const sortColumn =
    {
      timestamp: logRecords.timestamp,
      duration: logRecords.duration,
      status: logRecords.status,
      method: logRecords.method,
      endpoint: logRecords.endpoint,
    }[sortBy] ?? logRecords.timestamp;

  const orderByClause = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

  // Fetch paginated results
  const offset = (page - 1) * pageSize;
  const records = await db
    .select()
    .from(logRecords)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset);

  // Transform to API response format
  const data = records.map(transformToApiFormat);

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// Transform database record to the exact NDJSON format
function transformToApiFormat(record: DbLogRecord) {
  // Parse tags from JSON string if present
  let tags: string[] = [];
  if (record.tags) {
    try {
      tags = JSON.parse(record.tags);
    } catch {
      tags = [];
    }
  }

  return {
    // Root level fields
    timestamp: record.timestamp.toISOString(),
    traceId: record.traceId ?? "",
    spanId: record.spanId ?? "",
    severityText: record.severityText ?? "INFO",
    severityNumber: record.severityNumber ?? 9,
    // Body - exact NDJSON structure
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
    // Attributes - exact NDJSON structure
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
    // Resource - exact NDJSON structure
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
