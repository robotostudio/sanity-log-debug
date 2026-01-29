import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { isValidUrlDate, parseDateFromUrl } from "@/lib/date-utils";
import { db, files, logRecords } from "@/lib/db";
import type { LogRecord as DbLogRecord } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fileKey = params.get("fileKey");

  if (!fileKey) {
    return NextResponse.json(
      { error: "fileKey is required" },
      { status: 400 }
    );
  }

  // Get the file from database
  const dbFile = await db.query.files.findFirst({
    where: eq(files.key, fileKey),
  });

  if (!dbFile) {
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  }

  if (dbFile.processingStatus !== "ready") {
    return NextResponse.json(
      { error: "File is still processing", status: dbFile.processingStatus },
      { status: 202 }
    );
  }

  // Parse pagination and sorting
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(params.get("pageSize") ?? "50", 10);
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
    conditions.push(inArray(logRecords.severity, severities));
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

  // Search filter (URL or traceId)
  const search = params.get("search");
  if (search) {
    conditions.push(
      or(
        ilike(logRecords.url, `%${search}%`),
        ilike(logRecords.traceId, `%${search}%`)
      )!
    );
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
  const sortColumn = {
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

// Transform database record to the expected API format
function transformToApiFormat(record: DbLogRecord) {
  return {
    timestamp: record.timestamp.toISOString(),
    traceId: record.traceId ?? "",
    severityText: record.severity ?? "INFO",
    body: {
      method: record.method ?? "",
      status: record.status ?? 0,
      duration: record.duration ?? 0,
      url: record.url ?? "",
      responseSize: 0, // Not stored in DB
    },
    attributes: {
      sanity: {
        endpoint: record.endpoint ?? "",
        domain: record.domain ?? "",
        studioRequest: record.isStudioRequest === 1,
        groqQueryIdentifier: record.groqQueryId ?? null,
        apiVersion: "", // Not stored in DB
      },
    },
  };
}
