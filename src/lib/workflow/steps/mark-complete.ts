"use step";

import { eq } from "drizzle-orm";
import { db, files } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("workflow/mark-complete");

export async function markComplete({
  fileId,
  recordCount,
  failedRecords = 0,
}: {
  fileId: string;
  recordCount: number;
  failedRecords?: number;
}) {
  logger.info("Marking file as complete", {
    fileId,
    recordCount,
    failedRecords,
  });

  await db
    .update(files)
    .set({
      processingStatus: "ready",
      processedAt: new Date(),
      recordCount,
      failedRecords,
      errorMessage: null, // Clear any previous errors
      lastErrorAt: null,
    })
    .where(eq(files.id, fileId));

  logger.info("File marked as complete", {
    fileId,
    recordCount,
    failedRecords,
  });
}
