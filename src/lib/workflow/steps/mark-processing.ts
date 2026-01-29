"use step";

import { eq } from "drizzle-orm";
import { db, files } from "@/lib/db";

export async function markProcessing({ fileId }: { fileId: string }) {
  await db
    .update(files)
    .set({ processingStatus: "processing" })
    .where(eq(files.id, fileId));
}
