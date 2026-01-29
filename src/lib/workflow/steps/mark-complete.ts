"use step";

import { eq } from "drizzle-orm";
import { db, files } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("workflow/mark-complete");

export async function markComplete({
  fileId,
  recordCount,
}: {
  fileId: string;
  recordCount: number;
}) {
  logger.info("Marking file as complete", { fileId, recordCount });

  await db
    .update(files)
    .set({
      processingStatus: "ready",
      processedAt: new Date(),
      recordCount,
    })
    .where(eq(files.id, fileId));

  logger.info("File marked as complete", { fileId, recordCount });
}
