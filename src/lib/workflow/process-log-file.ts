"use workflow";

import { Logger } from "@/lib/logger";

import { createBatches } from "./steps/create-batches";
import { deleteFromR2 } from "./steps/delete-from-r2";
import { markComplete } from "./steps/mark-complete";
import { markFailed } from "./steps/mark-failed";
import { markProcessing } from "./steps/mark-processing";
import { processBatch } from "./steps/process-batch";

const logger = new Logger("workflow/process-log-file");

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

  logger.info("Starting workflow", { fileId, fileKey });

  try {
    await markProcessing({ fileId });

    let totalRecords = 0;
    let totalFailedRecords = 0;
    let batchesProcessed = 0;

    // Create all batches first (workflow steps must return serializable values)
    const { batches } = await createBatches({ fileKey });

    // Process each batch
    for (const batch of batches) {
      const result = await processBatch({ fileId, batch });

      if (!result.skipped) {
        totalRecords += result.recordsInserted;
        totalFailedRecords += result.parseErrors;
        batchesProcessed++;
      }

      logger.info("Batch progress", {
        fileId,
        batchIndex: batch.batchIndex,
        totalRecords,
        totalFailedRecords,
        batchesProcessed,
      });
    }

    logger.info("All batches processed", {
      fileId,
      totalRecords,
      totalFailedRecords,
      batchesProcessed,
    });

    await markComplete({
      fileId,
      recordCount: totalRecords,
      failedRecords: totalFailedRecords,
    });

    // Delete from R2 - non-critical, catch errors
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

    // Mark the file as failed so it doesn't get stuck in "processing"
    try {
      await markFailed({ fileId, error: errorMsg });
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
