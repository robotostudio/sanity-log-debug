"use workflow";

import { Logger } from "@/lib/logger";
import { createBatches } from "./steps/create-batches";
import { deleteFromR2 } from "./steps/delete-from-r2";
import { markComplete } from "./steps/mark-complete";
import { markProcessing } from "./steps/mark-processing";
import { processBatch } from "./steps/process-batch";

const logger = new Logger("workflow/process-log-file");

export interface ProcessLogFileInput {
  fileId: string;
  fileKey: string;
}

export async function processLogFile(input: ProcessLogFileInput) {
  const { fileId, fileKey } = input;

  logger.info("Starting workflow", { fileId, fileKey });

  await markProcessing({ fileId });

  // Create batches from the file
  const { totalRecords, batches } = await createBatches({ fileKey });

  logger.info("Processing batches", {
    fileId,
    totalRecords,
    totalBatches: batches.length,
  });

  // Process each batch as a separate step
  for (const batch of batches) {
    await processBatch({ fileId, batch });
  }

  logger.info("All batches processed", {
    fileId,
    batchesProcessed: batches.length,
  });

  await markComplete({ fileId, recordCount: totalRecords });
  await deleteFromR2({ fileKey });

  logger.info("Workflow complete", {
    fileId,
    recordCount: totalRecords,
    batchesProcessed: batches.length,
  });

  return {
    success: true,
    fileId,
    recordCount: totalRecords,
    batchesProcessed: batches.length,
  };
}
