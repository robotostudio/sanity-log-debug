"use step";

import { Logger } from "@/lib/logger";
import { getFileStream } from "@/lib/r2";
import type { LogRecord } from "@/lib/types";

const logger = new Logger("workflow/create-batches");
const BATCH_SIZE = 1000;
const MAX_ERROR_RATE = 0.5; // Abort if >50% of lines fail to parse

export interface BatchInfo {
  batchIndex: number;
  startLine: number;
  endLine: number;
  records: ParsedRecord[];
  parseErrors: ParseError[];
}

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

export async function* streamBatches(
  fileKey: string,
): AsyncGenerator<BatchInfo> {
  logger.info("Starting streaming batch creation", { fileKey });

  const stream = await getFileStream(fileKey);
  const records: ParsedRecord[] = [];
  const parseErrors: ParseError[] = [];
  let batchIndex = 0;
  let lineNumber = 0;
  let startLine = 0;
  let totalErrors = 0;
  let totalLines = 0;

  for await (const line of readLines(stream)) {
    lineNumber++;
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

      // Check error rate periodically
      if (totalLines >= 100) {
        const errorRate = totalErrors / totalLines;
        if (errorRate > MAX_ERROR_RATE) {
          const errorMsg = `Aborting: error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${MAX_ERROR_RATE * 100}%`;
          logger.error(errorMsg, { totalLines, totalErrors });
          throw new Error(errorMsg);
        }
      }
    }

    // Yield batch when full
    if (records.length >= BATCH_SIZE) {
      yield {
        batchIndex,
        startLine,
        endLine: lineNumber,
        records: [...records],
        parseErrors: [...parseErrors],
      };

      records.length = 0;
      parseErrors.length = 0;
      batchIndex++;
      startLine = lineNumber + 1;
    }
  }

  // Yield final partial batch
  if (records.length > 0 || parseErrors.length > 0) {
    yield {
      batchIndex,
      startLine,
      endLine: lineNumber,
      records: [...records],
      parseErrors: [...parseErrors],
    };
  }

  logger.info("Streaming batch creation complete", {
    fileKey,
    totalLines,
    totalErrors,
    totalBatches: batchIndex + 1,
  });
}

export interface CreateBatchesResult {
  totalRecords: number;
  totalBatches: number;
  totalParseErrors: number;
  batches: BatchInfo[];
}

export async function createBatches({
  fileKey,
}: {
  fileKey: string;
}): Promise<CreateBatchesResult> {
  logger.info("Creating batches from file (non-streaming)", { fileKey });

  const batches: BatchInfo[] = [];
  let totalRecords = 0;
  let totalParseErrors = 0;

  for await (const batch of streamBatches(fileKey)) {
    batches.push(batch);
    totalRecords += batch.records.length;
    totalParseErrors += batch.parseErrors.length;
  }

  logger.info("Batches created", {
    fileKey,
    totalRecords,
    totalParseErrors,
    totalBatches: batches.length,
    batchSize: BATCH_SIZE,
  });

  return {
    totalRecords,
    totalBatches: batches.length,
    totalParseErrors,
    batches,
  };
}
