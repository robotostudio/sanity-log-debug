"use step";

import { Logger } from "@/lib/logger";
import { getFileStream, getFileStreamWithRange } from "@/lib/r2";

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
// Uses byte offsets for O(1) seeking instead of O(N) line skipping
export interface BatchMetadata {
  batchIndex: number;
  byteStart: number;  // Byte offset where batch data starts
  byteEnd: number;    // Byte offset where batch data ends
  lineCount: number;  // Number of data lines in this batch
}

export interface CountLinesResult {
  totalLines: number;
  batchSize: number;
  batches: BatchMetadata[];
  headers: string[];
  headerByteEnd: number; // Byte offset where header line ends (for skipping)
}

/**
 * Fast line count with byte offset tracking for O(1) batch seeking.
 * Returns batch metadata with byte ranges for each batch.
 * This eliminates the O(N²) problem of re-reading from file start.
 */
export async function countLines({
  fileKey,
}: {
  fileKey: string;
}): Promise<CountLinesResult> {
  logger.info("Counting lines with byte offsets", { fileKey });

  const stream = await getFileStream(fileKey);
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let totalLines = 0;
  let buffer = "";
  let headers: string[] = [];
  let isFirstLine = true;

  // Byte offset tracking
  let currentByteOffset = 0;
  let headerByteEnd = 0;

  // Batch boundary tracking
  const batchBoundaries: { byteStart: number; lineCount: number }[] = [];
  let currentBatchByteStart = 0;
  let currentBatchLineCount = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      // Handle final line if buffer has content
      if (buffer.trim()) {
        if (!isFirstLine) {
          totalLines++;
          currentBatchLineCount++;
        }
      }
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Calculate byte length of this line (including newline)
      const lineByteLength = new TextEncoder().encode(line + "\n").length;

      if (line.trim()) {
        if (isFirstLine) {
          // Parse header row
          headers = parseCsvLine(line.trim());
          headerByteEnd = currentByteOffset + lineByteLength;
          currentBatchByteStart = headerByteEnd; // First batch starts after header
          isFirstLine = false;
        } else {
          totalLines++;
          currentBatchLineCount++;

          // Check if we've completed a batch
          if (currentBatchLineCount >= BATCH_SIZE) {
            const batchByteEnd = currentByteOffset + lineByteLength;
            batchBoundaries.push({
              byteStart: currentBatchByteStart,
              lineCount: currentBatchLineCount,
            });
            // Next batch starts at next byte
            currentBatchByteStart = batchByteEnd;
            currentBatchLineCount = 0;
          }
        }
      }

      currentByteOffset += lineByteLength;
    }
  }

  reader.releaseLock();

  // Handle final partial batch
  if (currentBatchLineCount > 0) {
    batchBoundaries.push({
      byteStart: currentBatchByteStart,
      lineCount: currentBatchLineCount,
    });
  }

  // Convert boundaries to BatchMetadata with byte ranges
  const batches: BatchMetadata[] = [];
  for (let i = 0; i < batchBoundaries.length; i++) {
    const boundary = batchBoundaries[i];
    const nextBoundary = batchBoundaries[i + 1];

    batches.push({
      batchIndex: i,
      byteStart: boundary.byteStart,
      // byteEnd is start of next batch, or end of file for last batch
      byteEnd: nextBoundary ? nextBoundary.byteStart : currentByteOffset,
      lineCount: boundary.lineCount,
    });
  }

  logger.info("Line count with byte offsets complete", {
    fileKey,
    totalLines,
    totalBatches: batches.length,
    batchSize: BATCH_SIZE,
    headerByteEnd,
    totalBytes: currentByteOffset,
  });

  return {
    totalLines,
    batchSize: BATCH_SIZE,
    batches,
    headers,
    headerByteEnd,
  };
}

export interface ReadBatchResult {
  records: ParsedRecord[];
  parseErrors: ParseError[];
}

/**
 * Reads and parses a specific batch from CSV file using byte range.
 * Uses R2 Range header for O(1) seeking - no re-reading from file start.
 * Called by processBatch - not a workflow step itself.
 */
export async function readBatchFromFile(
  fileKey: string,
  batch: BatchMetadata,
  headers: string[],
): Promise<ReadBatchResult> {
  const { batchIndex, byteStart, byteEnd, lineCount } = batch;

  logger.info("Reading batch from file with byte range", {
    fileKey,
    batchIndex,
    byteStart,
    byteEnd,
    expectedLines: lineCount,
  });

  // Use Range request to fetch only the bytes we need - O(1) seek!
  const stream = await getFileStreamWithRange(fileKey, byteStart, byteEnd - 1);
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  const records: ParsedRecord[] = [];
  const parseErrors: ParseError[] = [];
  let lineNumber = 0;
  let totalErrors = 0;
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process final line if buffer has content
        if (buffer.trim()) {
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
        processLine(trimmed);
      }
    }
  } finally {
    reader.releaseLock();
  }

  function processLine(line: string) {
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
        lineNumber: batchIndex * BATCH_SIZE + lineNumber, // Global line number
        error: result.error ?? "Unknown error",
        rawLine: line.length > 200 ? `${line.substring(0, 200)}...` : line,
      });

      // Check error rate after processing some lines
      if (lineNumber >= 100) {
        const errorRate = totalErrors / lineNumber;
        if (errorRate > MAX_ERROR_RATE) {
          const errorMsg = `Aborting: error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${MAX_ERROR_RATE * 100}%`;
          logger.error(errorMsg, { lineNumber, totalErrors });
          throw new Error(errorMsg);
        }
      }
    }
  }

  logger.info("Batch read complete", {
    fileKey,
    batchIndex,
    byteRange: `${byteStart}-${byteEnd}`,
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
