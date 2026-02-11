"use workflow";

import pMap from "p-map";
import { eq } from "drizzle-orm";
import { Logger } from "@/lib/logger";
import { db, files } from "@/lib/db";

import { countLines } from "./steps/create-batches";
import { deleteFromR2 } from "./steps/delete-from-r2";
import { markComplete } from "./steps/mark-complete";
import { markFailed } from "./steps/mark-failed";
import { markProcessing } from "./steps/mark-processing";
import {
  processBatch,
  type ProcessBatchResult,
} from "./steps/process-batch";

const logger = new Logger("workflow/process-log-file");

// Parallel batch processing configuration
const MAX_PARALLEL_BATCHES = 4; // Process up to 4 batches concurrently

export interface ProcessLogFileInput {
  fileId: string;
  fileKey: string;
}

export interface ProcessLogFileResult {
  success: boolean;
  fileId: string;
  recordCount: number;
  batchesProcessed: number;
  failedRecords: number;
  error?: string;
}

export async function processLogFile(
  input: ProcessLogFileInput,
): Promise<ProcessLogFileResult> {
  const { fileId, fileKey } = input;

  logger.info("Starting optimized workflow", { fileId, fileKey });

  try {
    await markProcessing({ fileId });

    let totalRecords = 0;
    let totalFailedRecords = 0;
    let batchesProcessed = 0;
    let failedBatchCount = 0;

    // Get batch metadata with byte offsets for O(1) seeking
    const { batches, headers, headerByteEnd } = await countLines({ fileKey });

    logger.info("File scanned with byte offsets", {
      fileId,
      totalBatches: batches.length,
      headerByteEnd,
      maxParallel: MAX_PARALLEL_BATCHES,
    });

    // Process all batches with p-map concurrency — null = failed batch
    const outcomes = await pMap(
      batches,
      async (batch): Promise<ProcessBatchResult | null> => {
        try {
          return await processBatch({ fileId, fileKey, batch, headers });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error("Batch failed", { fileId, batchIndex: batch.batchIndex, error: msg });
          return null;
        }
      },
      { concurrency: MAX_PARALLEL_BATCHES },
    );

    for (const result of outcomes) {
      if (!result) {
        failedBatchCount++;
        continue;
      }
      if (!result.skipped) {
        totalRecords += result.recordsInserted;
        totalFailedRecords += result.parseErrors;
        batchesProcessed++;
      }
      logger.info("Batch progress", {
        fileId,
        batchIndex: result.batchIndex,
        recordsInserted: result.recordsInserted,
        parseErrors: result.parseErrors,
        skipped: result.skipped,
      });
    }

    logger.info("All batches settled", {
      fileId,
      totalRecords,
      totalFailedRecords,
      batchesProcessed,
      failedBatchCount,
    });

    // Total failure — no records ingested at all
    if (totalRecords === 0 && failedBatchCount > 0) {
      const errorMsg = `All ${failedBatchCount} batch(es) failed — 0 records ingested`;
      await markFailed({ fileId, error: errorMsg });
      // Do NOT delete from R2 — source data needed for retry
      return {
        success: false,
        fileId,
        recordCount: 0,
        batchesProcessed: 0,
        failedRecords: 0,
        error: errorMsg,
      };
    }

    // Partial success — some batches failed but some records ingested
    if (failedBatchCount > 0) {
      const errorMsg = `${failedBatchCount} batch(es) failed — ${totalRecords} records ingested, partial data`;
      await markComplete({
        fileId,
        recordCount: totalRecords,
        failedRecords: totalFailedRecords,
      });
      // Do NOT delete from R2 — source data may be needed for re-processing
      logger.warn("Partial success — skipping R2 delete", {
        fileId,
        failedBatchCount,
        totalRecords,
      });

      return {
        success: true,
        fileId,
        recordCount: totalRecords,
        batchesProcessed,
        failedRecords: totalFailedRecords,
        error: errorMsg,
      };
    }

    // Full success — all batches completed
    await markComplete({
      fileId,
      recordCount: totalRecords,
      failedRecords: totalFailedRecords,
    });

    // Delete from R2 — non-critical, catch errors
    try {
      await deleteFromR2({ fileKey });
    } catch (deleteError) {
      logger.warn("Failed to delete file from R2 (non-critical)", {
        fileKey,
        error:
          deleteError instanceof Error
            ? deleteError.message
            : String(deleteError),
      });
    }

    logger.info("Workflow complete", {
      fileId,
      recordCount: totalRecords,
      failedRecords: totalFailedRecords,
      batchesProcessed,
    });

    return {
      success: true,
      fileId,
      recordCount: totalRecords,
      batchesProcessed,
      failedRecords: totalFailedRecords,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error("Workflow failed", {
      fileId,
      fileKey,
      error: errorMsg,
    });

    // Guard: only mark failed if still in "processing" state (prevents 409 race)
    try {
      const file = await db.query.files.findFirst({
        where: eq(files.id, fileId),
        columns: { processingStatus: true },
      });
      if (file?.processingStatus === "processing") {
        await markFailed({ fileId, error: errorMsg });
      }
    } catch (markError) {
      logger.error("Failed to mark file as failed", {
        fileId,
        markError:
          markError instanceof Error ? markError.message : String(markError),
      });
    }

    return {
      success: false,
      fileId,
      recordCount: 0,
      batchesProcessed: 0,
      failedRecords: 0,
      error: errorMsg,
    };
  }
}
