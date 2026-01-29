"use step";

import { eq } from "drizzle-orm";
import { db, files } from "@/lib/db";

export async function markComplete({
  fileId,
  recordCount,
}: {
  fileId: string;
  recordCount: number;
}) {
  await db
    .update(files)
    .set({
      processingStatus: "ready",
      processedAt: new Date(),
      recordCount,
    })
    .where(eq(files.id, fileId));
}
