"use step";

import { eq } from "drizzle-orm";
import { db, files } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("workflow/mark-processing");

export async function markProcessing({ fileId }: { fileId: string }) {
  logger.info("Marking file as processing", { fileId });

  await db
    .update(files)
    .set({ processingStatus: "processing" })
    .where(eq(files.id, fileId));

  logger.info("File marked as processing", { fileId });
}
