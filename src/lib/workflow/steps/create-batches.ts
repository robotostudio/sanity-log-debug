"use step";

import { Logger } from "@/lib/logger";
import { getFileStream } from "@/lib/r2";

const logger = new Logger("workflow/create-batches");

// Increased batch size for better throughput - fewer batches = less overhead
const BATCH_SIZE = 5000;
const MAX_ERROR_RATE = 0.5; // Abort if >50% of lines fail to parse

export interface ParsedRecord {
  timestamp: string;
  traceId?: string;
  spanId?: string;
  severityText?: string;
  severityNumber?: number;
  duration?: number;
  insertId?: string;
  method?: string;
  referer?: string;
  remoteIp?: string;
  requestSize?: number;
  responseSize?: number;
  status?: number;
  url?: string;
  userAgent?: string;
  projectId?: string;
  dataset?: string;
  domain?: string;
  endpoint?: string;
  groqQueryId?: string;
  apiVersion?: string;
  tags?: string | null;
  isStudioRequest: number;
  resourceServiceName?: string;
  resourceSanityType?: string;
  resourceSanityVersion?: string;
}

export interface ParseError {
  lineNumber: number;
  error: string;
  rawLine?: string;
}

interface ParseResult {
  success: boolean;
  record?: ParsedRecord;
  error?: string;
}

interface CsvRow {
  timestamp?: string;
  traceId?: string;
  spanId?: string;
  severityText?: string;
  severityNumber?: string;
  body?: string;
  attributes?: string;
  resource?: string;
}

/**
 * Parse a CSV line handling quoted fields with commas and escaped quotes
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote (doubled)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ",") {
        fields.push(current);
        current = "";
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  // Push the last field
  fields.push(current);

  return fields;
}

function isValidTimestamp(ts: unknown): ts is string {
  if (typeof ts !== "string" || !ts) return false;
  const date = new Date(ts);
  return !Number.isNaN(date.getTime());
}

function safeParseJson<T>(jsonStr: string | undefined): T | undefined {
  if (!jsonStr) return undefined;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return undefined;
  }
}

interface BodyJson {
  duration?: number;
  insertId?: string;
  method?: string;
  referer?: string;
  remoteIp?: string;
  requestSize?: number;
  responseSize?: number;
  status?: number;
  url?: string;
  userAgent?: string;
}

interface AttributesJson {
  sanity?: {
    projectId?: string;
    dataset?: string;
    domain?: string;
    endpoint?: string;
    groqQueryIdentifier?: string;
    apiVersion?: string;
    tags?: string[];
    studioRequest?: boolean;
  };
}

interface ResourceJson {
  service?: {
    name?: string;
  };
  sanity?: {
    type?: string;
    version?: string;
  };
}

function safeParseRecord(
  row: CsvRow,
  _lineNumber: number,
): ParseResult {
  try {
    // Validate required timestamp
    if (!isValidTimestamp(row.timestamp)) {
      return {
        success: false,
        error: `Invalid or missing timestamp: ${row.timestamp}`,
      };
    }

    const body = safeParseJson<BodyJson>(row.body);
    const attributes = safeParseJson<AttributesJson>(row.attributes);
    const resource = safeParseJson<ResourceJson>(row.resource);

    const sanity = attributes?.sanity;

    return {
      success: true,
      record: {
        timestamp: row.timestamp,
        traceId: row.traceId || undefined,
        spanId: row.spanId || undefined,
        severityText: row.severityText || undefined,
        severityNumber: row.severityNumber ? Number.parseInt(row.severityNumber, 10) : undefined,
        duration: body?.duration,
        insertId: body?.insertId,
        method: body?.method,
        referer: body?.referer,
        remoteIp: body?.remoteIp,
        requestSize: body?.requestSize,
        responseSize: body?.responseSize,
        status: body?.status,
        url: body?.url,
        userAgent: body?.userAgent,
        projectId: sanity?.projectId,
        dataset: sanity?.dataset,
        domain: sanity?.domain,
        endpoint: sanity?.endpoint,
        groqQueryId: sanity?.groqQueryIdentifier,
        apiVersion: sanity?.apiVersion,
        tags: sanity?.tags ? JSON.stringify(sanity.tags) : null,
        isStudioRequest: sanity?.studioRequest ? 1 : 0,
        resourceServiceName: resource?.service?.name,
        resourceSanityType: resource?.sanity?.type,
        resourceSanityVersion: resource?.sanity?.version,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// Lightweight metadata for workflow state - no records included
export interface BatchMetadata {
  batchIndex: number;
  startLine: number;
  endLine: number;
}

export interface CountLinesResult {
  totalLines: number;
  batchSize: number;
  batches: BatchMetadata[];
  headers: string[];
}

/**
 * Fast line count - only counts newlines, doesn't parse content.
 * Returns batch metadata with line ranges for each batch.
 * Note: Line 1 is the header, data starts at line 2.
 */
export async function countLines({
  fileKey,
}: {
  fileKey: string;
}): Promise<CountLinesResult> {
  logger.info("Counting lines in file", { fileKey });

  const stream = await getFileStream(fileKey);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let totalLines = 0;
  let buffer = "";
  let headers: string[] = [];
  let isFirstLine = true;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      // Count final line if buffer has content
      if (buffer.trim()) {
        totalLines++;
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.trim()) {
        if (isFirstLine) {
          // Parse header row
          headers = parseCsvLine(line.trim());
          isFirstLine = false;
        } else {
          totalLines++;
        }
      }
    }
  }

  reader.releaseLock();

  // Calculate batch metadata (data lines only, excluding header)
  const batches: BatchMetadata[] = [];
  const totalBatches = Math.ceil(totalLines / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    // Line numbers are 1-indexed, with line 1 being header
    // Data starts at line 2, so batch 0 covers lines 2 to (2 + BATCH_SIZE - 1)
    const startLine = i * BATCH_SIZE + 2; // +2 because header is line 1
    const endLine = Math.min((i + 1) * BATCH_SIZE + 1, totalLines + 1);
    batches.push({
      batchIndex: i,
      startLine,
      endLine,
    });
  }

  logger.info("Line count complete", {
    fileKey,
    totalLines,
    totalBatches: batches.length,
    batchSize: BATCH_SIZE,
    headers: headers.length,
  });

  return {
    totalLines,
    batchSize: BATCH_SIZE,
    batches,
    headers,
  };
}

export interface ReadBatchResult {
  records: ParsedRecord[];
  parseErrors: ParseError[];
}

/**
 * Reads and parses a specific batch from CSV file by line range.
 * Called by processBatch - not a workflow step itself.
 */
export async function readBatchFromFile(
  fileKey: string,
  startLine: number,
  endLine: number,
): Promise<ReadBatchResult> {
  logger.info("Reading batch from file", { fileKey, startLine, endLine });

  const stream = await getFileStream(fileKey);
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const records: ParsedRecord[] = [];
  const parseErrors: ParseError[] = [];
  let lineNumber = 0;
  let totalErrors = 0;
  let totalLines = 0;
  let headers: string[] = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process final line if buffer has content
        if (buffer.trim()) {
          lineNumber++;
          if (lineNumber >= startLine && lineNumber <= endLine) {
            processLine(buffer.trim());
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        lineNumber++;

        // First line is header
        if (lineNumber === 1) {
          headers = parseCsvLine(trimmed);
          continue;
        }

        // Skip lines before our range
        if (lineNumber < startLine) continue;

        // Stop after our range - release reader and return early
        if (lineNumber > endLine) {
          reader.releaseLock();
          return { records, parseErrors };
        }

        processLine(trimmed);
      }
    }
  } finally {
    reader.releaseLock();
  }

  function processLine(line: string) {
    totalLines++;

    // Parse CSV line into fields
    const fields = parseCsvLine(line);

    // Map fields to row object using headers
    const row: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = fields[i] ?? "";
      (row as Record<string, string>)[header] = value;
    }

    const result = safeParseRecord(row, lineNumber);

    if (result.success && result.record) {
      records.push(result.record);
    } else {
      totalErrors++;
      parseErrors.push({
        lineNumber,
        error: result.error ?? "Unknown error",
        rawLine: line.length > 200 ? `${line.substring(0, 200)}...` : line,
      });

      // Check error rate after processing some lines
      if (totalLines >= 100) {
        const errorRate = totalErrors / totalLines;
        if (errorRate > MAX_ERROR_RATE) {
          const errorMsg = `Aborting: error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${MAX_ERROR_RATE * 100}%`;
          logger.error(errorMsg, { totalLines, totalErrors });
          throw new Error(errorMsg);
        }
      }
    }
  }

  logger.info("Batch read complete", {
    fileKey,
    startLine,
    endLine,
    recordCount: records.length,
    parseErrorCount: parseErrors.length,
  });

  return { records, parseErrors };
}

// ============================================================================
// Single-Pass Streaming Processing (NEW - Optimized)
// ============================================================================

export interface StreamBatch {
  batchIndex: number;
  records: ParsedRecord[];
  parseErrors: ParseError[];
}

/**
 * Stream the file once and yield batches as they fill up.
 * This eliminates the O(n²) re-reading problem completely.
 */
export async function* streamBatches(
  fileKey: string,
): AsyncGenerator<StreamBatch> {
  logger.info("Starting single-pass streaming", { fileKey });

  const stream = await getFileStream(fileKey);
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let headers: string[] = [];
  let lineNumber = 0;
  let batchIndex = 0;
  let currentBatch: ParsedRecord[] = [];
  let currentErrors: ParseError[] = [];
  let totalErrors = 0;
  let totalLines = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process final line if buffer has content
        if (buffer.trim() && headers.length > 0) {
          lineNumber++;
          processLine(buffer.trim());
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        lineNumber++;

        // First line is header
        if (lineNumber === 1) {
          headers = parseCsvLine(trimmed);
          continue;
        }

        processLine(trimmed);

        // Yield batch when full
        if (currentBatch.length >= BATCH_SIZE) {
          yield {
            batchIndex,
            records: currentBatch,
            parseErrors: currentErrors,
          };
          batchIndex++;
          currentBatch = [];
          currentErrors = [];
        }
      }
    }

    // Yield final batch if has records
    if (currentBatch.length > 0) {
      yield {
        batchIndex,
        records: currentBatch,
        parseErrors: currentErrors,
      };
    }
  } finally {
    reader.releaseLock();
  }

  function processLine(line: string) {
    totalLines++;

    const fields = parseCsvLine(line);
    const row: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = fields[i] ?? "";
      (row as Record<string, string>)[header] = value;
    }

    const result = safeParseRecord(row, lineNumber);

    if (result.success && result.record) {
      currentBatch.push(result.record);
    } else {
      totalErrors++;
      currentErrors.push({
        lineNumber,
        error: result.error ?? "Unknown error",
        rawLine: line.length > 200 ? `${line.substring(0, 200)}...` : line,
      });

      if (totalLines >= 100) {
        const errorRate = totalErrors / totalLines;
        if (errorRate > MAX_ERROR_RATE) {
          throw new Error(
            `Aborting: error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold`,
          );
        }
      }
    }
  }

  logger.info("Streaming complete", {
    fileKey,
    totalBatches: batchIndex + 1,
    totalLines,
    totalErrors,
  });
}

export { BATCH_SIZE };
