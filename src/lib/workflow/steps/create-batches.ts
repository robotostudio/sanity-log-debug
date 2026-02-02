"use step";

import { Logger } from "@/lib/logger";
import { getFileStream } from "@/lib/r2";
import type { LogRecord } from "@/lib/types";

const logger = new Logger("workflow/create-batches");
export const BATCH_SIZE = 1000;
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

function isValidTimestamp(ts: unknown): ts is string {
  if (typeof ts !== "string" || !ts) return false;
  const date = new Date(ts);
  return !Number.isNaN(date.getTime());
}

function safeParseRecord(line: string, _lineNumber: number): ParseResult {
  try {
    const record = JSON.parse(line) as LogRecord;

    // Validate required timestamp
    if (!isValidTimestamp(record.timestamp)) {
      return {
        success: false,
        error: `Invalid or missing timestamp: ${record.timestamp}`,
      };
    }

    const body = record.body;
    const sanity = record.attributes?.sanity;
    const resource = record.resource;

    return {
      success: true,
      record: {
        timestamp: record.timestamp,
        traceId: record.traceId,
        spanId: record.spanId,
        severityText: record.severityText,
        severityNumber: record.severityNumber,
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
      error: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function* readLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Yield any remaining content in buffer
        if (buffer.trim()) {
          yield buffer.trim();
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last partial line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          yield trimmed;
        }
      }
    }
  } finally {
    reader.releaseLock();
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
}

/**
 * Fast line count - only counts newlines, doesn't parse JSON.
 * Returns batch metadata with line ranges for each batch.
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
        totalLines++;
      }
    }
  }

  reader.releaseLock();

  // Calculate batch metadata
  const batches: BatchMetadata[] = [];
  const totalBatches = Math.ceil(totalLines / BATCH_SIZE);

  for (let i = 0; i < totalBatches; i++) {
    const startLine = i * BATCH_SIZE + 1;
    const endLine = Math.min((i + 1) * BATCH_SIZE, totalLines);
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
  });

  return {
    totalLines,
    batchSize: BATCH_SIZE,
    batches,
  };
}

export interface ReadBatchResult {
  records: ParsedRecord[];
  parseErrors: ParseError[];
}

/**
 * Reads and parses a specific batch from file by line range.
 * Called by processBatch - not a workflow step itself.
 */
export async function readBatchFromFile(
  fileKey: string,
  startLine: number,
  endLine: number,
): Promise<ReadBatchResult> {
  logger.info("Reading batch from file", { fileKey, startLine, endLine });

  const stream = await getFileStream(fileKey);
  const records: ParsedRecord[] = [];
  const parseErrors: ParseError[] = [];
  let lineNumber = 0;
  let totalErrors = 0;
  let totalLines = 0;

  for await (const line of readLines(stream)) {
    lineNumber++;

    // Skip lines before our range
    if (lineNumber < startLine) continue;

    // Stop after our range
    if (lineNumber > endLine) break;

    totalLines++;
    const result = safeParseRecord(line, lineNumber);

    if (result.success && result.record) {
      records.push(result.record);
    } else {
      totalErrors++;
      parseErrors.push({
        lineNumber,
        error: result.error ?? "Unknown error",
        rawLine: line.length > 200 ? `${line.substring(0, 200)}...` : line,
      });

      // Check error rate
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
