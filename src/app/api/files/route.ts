import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import {
  deleteFileSchema,
  Errors,
  handleError,
  presignedUrlSchema,
  requireFileExists,
  success,
  uploadConfirmSchema,
  validateSchema,
} from "@/lib/api";
import { db, files, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { deleteFile, getPresignedUploadUrl } from "@/lib/r2";
import { processLogFile } from "@/lib/workflow";

const logger = new Logger("api/files");

export async function GET() {
  try {
    logger.info("Listing files");
    const dbFiles = await db.query.files.findMany({
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename } = validateSchema(presignedUrlSchema, body);

    logger.info("Getting presigned URL", { filename });
    const { url, key } = await getPresignedUploadUrl(filename);
    logger.info("Presigned URL generated", { key });

    return success({ url, key });
  } catch (error) {
    logger.error("Failed to get upload URL", error);
    return handleError(error, "Failed to get upload URL");
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, filename, size } = validateSchema(uploadConfirmSchema, body);

    logger.info("Confirming upload", { key, filename, size });

    const fileId = crypto.randomUUID();

    await db.insert(files).values({
      id: fileId,
      key,
      filename: filename || key.split("/").pop() || key,
      size: size || 0,
      processingStatus: "pending",
    });
    logger.info("File record created", { fileId, key });

    let workflowRunId: string | null = null;
    try {
      const workflowRun = await start(processLogFile, [
        { fileId, fileKey: key },
      ]);
      workflowRunId = workflowRun.runId;
      logger.info("Processing workflow started", { fileId, workflowRunId });

      await db.update(files).set({ workflowRunId }).where(eq(files.id, fileId));
    } catch (workflowError) {
      logger.error("Failed to start workflow", {
        fileId,
        error: workflowError,
      });
      await db
        .update(files)
        .set({ processingStatus: "failed" })
        .where(eq(files.id, fileId));
      throw Errors.workflow("Failed to start processing workflow", {
        fileId,
        error:
          workflowError instanceof Error
            ? workflowError.message
            : String(workflowError),
      });
    }

    return success({
      fileId,
      workflowRunId,
      processingStatus: "pending",
    });
  } catch (error) {
    logger.error("Failed to confirm upload", error);
    return handleError(error, "Failed to confirm upload");
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { key } = validateSchema(deleteFileSchema, body);

    logger.info("DELETE request", { key });

    const { file: fileRecord } = await requireFileExists(key);

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
