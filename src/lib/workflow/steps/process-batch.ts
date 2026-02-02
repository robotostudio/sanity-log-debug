"use step";

import { and, eq } from "drizzle-orm";

import { batchProgress, db, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { withRetry } from "../utils/retry";
import type { BatchInfo, ParsedRecord, ParseError } from "./create-batches";

const logger = new Logger("workflow/process-batch");

export interface ProcessBatchResult {
  batchIndex: number;
  recordsInserted: number;
  parseErrors: number;
  skipped: boolean;
}

async function shouldSkipBatch(
  fileId: string,
  batchIndex: number,
): Promise<boolean> {
  const existing = await db.query.batchProgress.findFirst({
    where: and(
      eq(batchProgress.fileId, fileId),
      eq(batchProgress.batchIndex, batchIndex),
      eq(batchProgress.status, "completed"),
    ),
  });
  return !!existing;
}

async function createBatchRecord(
  fileId: string,
  batchIndex: number,
  recordCount: number,
): Promise<void> {
  await db
    .insert(batchProgress)
    .values({
      fileId,
      batchIndex,
      status: "pending",
      recordCount,
      startedAt: new Date(),
    })
    .onConflictDoNothing();
}

async function markBatchCompleted(
  fileId: string,
  batchIndex: number,
  parseErrors: number,
): Promise<void> {
  await db
    .update(batchProgress)
    .set({
      status: "completed",
      parseErrors,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(batchProgress.fileId, fileId),
        eq(batchProgress.batchIndex, batchIndex),
      ),
    );
}

async function markBatchFailed(
  fileId: string,
  batchIndex: number,
  error: string,
): Promise<void> {
  await db
    .update(batchProgress)
    .set({
      status: "failed",
      errorMessage: error.substring(0, 1000),
    })
    .where(
      and(
        eq(batchProgress.fileId, fileId),
        eq(batchProgress.batchIndex, batchIndex),
      ),
    );
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export async function processBatch({
  fileId,
  batch,
}: {
  fileId: string;
  batch: BatchInfo;
}): Promise<ProcessBatchResult> {
  const { batchIndex, records, parseErrors } = batch;

  logger.info("Processing batch", {
    fileId,
    batchIndex,
    recordCount: records.length,
    parseErrors: parseErrors.length,
    lineRange: `${batch.startLine}-${batch.endLine}`,
  });

  // Check if batch already processed (for recovery)
  const shouldSkip = await shouldSkipBatch(fileId, batchIndex);
  if (shouldSkip) {
    logger.info("Skipping already completed batch", { fileId, batchIndex });
    return {
      batchIndex,
      recordsInserted: 0,
      parseErrors: parseErrors.length,
      skipped: true,
    };
  }

  // Create batch tracking record
  await createBatchRecord(fileId, batchIndex, records.length);

  // Log parse errors for debugging
  if (parseErrors.length > 0) {
    logParseErrors(fileId, batchIndex, parseErrors);
  }

  // Filter out records with invalid timestamps (defensive)
  const validRecords = records.filter((record) => {
    const date = new Date(record.timestamp);
    if (!isValidDate(date)) {
      logger.warn(
        "Skipping record with invalid timestamp at batch processing",
        {
          fileId,
          batchIndex,
          timestamp: record.timestamp,
        },
      );
      return false;
    }
    return true;
  });

  if (validRecords.length === 0) {
    logger.warn("No valid records in batch", { fileId, batchIndex });
    await markBatchCompleted(fileId, batchIndex, parseErrors.length);
    return {
      batchIndex,
      recordsInserted: 0,
      parseErrors: parseErrors.length,
      skipped: false,
    };
  }

  const dbRecords = validRecords.map((record: ParsedRecord) => ({
    fileId,
    timestamp: new Date(record.timestamp),
    traceId: record.traceId,
    spanId: record.spanId,
    severityText: record.severityText,
    severityNumber: record.severityNumber,
    duration: record.duration,
    insertId: record.insertId,
    method: record.method,
    referer: record.referer,
    remoteIp: record.remoteIp,
    requestSize: record.requestSize,
    responseSize: record.responseSize,
    status: record.status,
    url: record.url,
    userAgent: record.userAgent,
    projectId: record.projectId,
    dataset: record.dataset,
    domain: record.domain,
    endpoint: record.endpoint,
    groqQueryId: record.groqQueryId,
    apiVersion: record.apiVersion,
    tags: record.tags,
    isStudioRequest: record.isStudioRequest,
    resourceServiceName: record.resourceServiceName,
    resourceSanityType: record.resourceSanityType,
    resourceSanityVersion: record.resourceSanityVersion,
  }));

  try {
    // Insert with retry and idempotency
    await withRetry(async () => {
      await db.insert(logRecords).values(dbRecords);
    }, `Insert batch ${batchIndex}`);

    await markBatchCompleted(fileId, batchIndex, parseErrors.length);

    logger.info("Batch processed", {
      fileId,
      batchIndex,
      recordsInserted: dbRecords.length,
      parseErrors: parseErrors.length,
    });

    return {
      batchIndex,
      recordsInserted: dbRecords.length,
      parseErrors: parseErrors.length,
      skipped: false,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await markBatchFailed(fileId, batchIndex, errorMsg);
    throw error;
  }
}

function logParseErrors(
  fileId: string,
  batchIndex: number,
  errors: ParseError[],
): void {
  // Log first few errors for debugging
  const samplesToLog = errors.slice(0, 5);
  for (const error of samplesToLog) {
    logger.warn("Parse error in batch", {
      fileId,
      batchIndex,
      lineNumber: error.lineNumber,
      error: error.error,
      rawLine: error.rawLine,
    });
  }

  if (errors.length > 5) {
    logger.warn(`... and ${errors.length - 5} more parse errors`, {
      fileId,
      batchIndex,
    });
  }
}
