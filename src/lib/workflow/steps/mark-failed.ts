"use step";

import { eq } from "drizzle-orm";
import { db, files } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("workflow/mark-failed");

export async function markFailed({
  fileId,
  error,
  failedRecords = 0,
}: {
  fileId: string;
  error: string;
  failedRecords?: number;
}) {
  logger.error("Marking file as failed", { fileId, error, failedRecords });

  await db
    .update(files)
    .set({
      processingStatus: "failed",
      errorMessage: error.substring(0, 1000), // Truncate to avoid DB issues
      lastErrorAt: new Date(),
      failedRecords,
    })
    .where(eq(files.id, fileId));

  logger.info("File marked as failed", { fileId });
}
