import { and, eq, gte, ilike, inArray, lte, or, type SQL } from "drizzle-orm";
import { isValidUrlDate, parseDateFromUrl } from "@/lib/date-utils";
import { db, files, logRecords } from "@/lib/db";
import type { File } from "@/lib/db/schema";
import { Errors } from "./api-errors";
import type { ValidatedFilters } from "./api-validation";

export interface FileResult {
  file: File;
  fileId: string;
}

type FileLookup =
  | { by: "key"; key: string; requireReady?: boolean }
  | { by: "id"; id: string };

/**
 * Unified file lookup function.
 * Throws 404 if not found, 202 if requireReady and still processing.
 */
export async function getFile(lookup: FileLookup): Promise<FileResult> {
  const file = await db.query.files.findFirst({
    where:
      lookup.by === "key" ? eq(files.key, lookup.key) : eq(files.id, lookup.id),
  });

  if (!file) {
    throw lookup.by === "key"
      ? Errors.fileNotFound(lookup.key)
      : Errors.notFound("File");
  }

  if (
    lookup.by === "key" &&
    lookup.requireReady &&
    file.processingStatus !== "ready"
  ) {
    throw Errors.fileProcessing(file.processingStatus);
  }

  return { file, fileId: file.id };
}

/**
 * Require file to exist and be ready for querying.
 * Throws 404 if not found, 202 if still processing.
 */
export const requireFileReady = (fileKey: string) =>
  getFile({ by: "key", key: fileKey, requireReady: true });

/**
 * Require file to exist (any processing status).
 * Throws 404 if not found.
 */
export const requireFileExists = (fileKey: string) =>
  getFile({ by: "key", key: fileKey });

/**
 * Require file by ID (any processing status).
 * Throws 404 if not found.
 */
export const requireFileById = (id: string) => getFile({ by: "id", id });

/**
 * Escape special characters for SQL LIKE patterns
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * Build Drizzle SQL conditions from validated filters.
 * Always includes fileId condition.
 */
export function buildFilterConditions(
  fileId: string,
  filters: ValidatedFilters,
): SQL {
  const conditions: SQL[] = [eq(logRecords.fileId, fileId)];

  // Date filters
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

  // Array filters
  if (filters.severity?.length) {
    conditions.push(inArray(logRecords.severityText, filters.severity));
  }

  if (filters.method?.length) {
    conditions.push(inArray(logRecords.method, filters.method));
  }

  if (filters.status?.length) {
    const statuses = filters.status.map((s) => Number.parseInt(s, 10));
    conditions.push(inArray(logRecords.status, statuses));
  }

  if (filters.endpoint?.length) {
    conditions.push(inArray(logRecords.endpoint, filters.endpoint));
  }

  if (filters.domain?.length) {
    conditions.push(inArray(logRecords.domain, filters.domain));
  }

  // Studio filter
  if (filters.studio === "true") {
    conditions.push(eq(logRecords.isStudioRequest, 1));
  } else if (filters.studio === "false") {
    conditions.push(eq(logRecords.isStudioRequest, 0));
  }

  // Search filter (URL or traceId)
  if (filters.search) {
    const escapedSearch = escapeLikePattern(filters.search);
    const searchCondition = or(
      ilike(logRecords.url, `%${escapedSearch}%`),
      ilike(logRecords.traceId, `%${escapedSearch}%`),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  // GROQ ID filter
  if (filters.groqId) {
    conditions.push(eq(logRecords.groqQueryId, filters.groqId));
  }

  // Always at least one condition (fileId), so and() won't return undefined
  const result = and(...conditions);
  if (!result) {
    throw new Error("Unexpected: buildFilterConditions produced no SQL");
  }
  return result;
}
