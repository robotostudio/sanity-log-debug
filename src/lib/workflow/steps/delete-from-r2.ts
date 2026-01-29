"use step";

import { Logger } from "@/lib/logger";
import { deleteFile } from "@/lib/r2";

const logger = new Logger("workflow/delete-from-r2");

export async function deleteFromR2({ fileKey }: { fileKey: string }) {
  logger.info("Deleting file from R2", { fileKey });

  await deleteFile(fileKey);

  logger.info("File deleted from R2", { fileKey });
}
