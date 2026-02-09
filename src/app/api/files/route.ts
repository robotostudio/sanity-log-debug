import { eq } from "drizzle-orm";
import {
  deleteFileSchema,
  Errors,
  handleError,
  requireAuth,
  requireFileExists,
  success,
  validateSchema,
} from "@/lib/api";
import { db, files, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { deleteFile } from "@/lib/r2";

const logger = new Logger("api/files");

export async function GET() {
  try {
    const user = await requireAuth();

    const isAdmin = user.role === "admin";

    const dbFiles = await db.query.files.findMany({
      where: isAdmin ? undefined : eq(files.userId, user.id),
      orderBy: (files, { desc }) => [desc(files.uploadedAt)],
    });

    const filesList = dbFiles.map((file) => ({
      key: file.key,
      size: file.size,
      lastModified: file.uploadedAt.toISOString(),
      processingStatus: file.processingStatus,
      recordCount: file.recordCount,
      filename: file.filename,
      id: file.id,
    }));

    logger.info("Files listed", { count: filesList.length });
    return success({ files: filesList });
  } catch (error) {
    logger.error("Failed to list files", error);
    return handleError(error, "Failed to list files");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { key } = validateSchema(deleteFileSchema, body);

    logger.info("DELETE request", { key });

    const { file: fileRecord } = await requireFileExists(key);

    // Check ownership (admin bypasses)
    if (user.role !== "admin" && fileRecord.userId !== user.id) {
      throw Errors.notFound("File");
    }

    logger.info("Deleting log records", { fileId: fileRecord.id });
    await db.delete(logRecords).where(eq(logRecords.fileId, fileRecord.id));
    logger.info("Log records deleted");

    logger.info("Deleting file record", { key });
    await db.delete(files).where(eq(files.key, key));
    logger.info("File record deleted");

    await deleteFile(key).catch((r2Error) => {
      logger.warn("R2 delete skipped (may already be deleted)", r2Error);
    });
    logger.info("R2 file deletion attempted");

    logger.info("File deletion complete", { key });
    return success({ deleted: true });
  } catch (error) {
    logger.error("Failed to delete file", error);
    return handleError(error, "Failed to delete file");
  }
}
