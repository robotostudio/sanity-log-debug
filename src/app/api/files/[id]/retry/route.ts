import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import {
  handleError,
  requireAuth,
  requireFileById,
  success,
  Errors,
} from "@/lib/api";
import { db, files, logRecords, batchProgress } from "@/lib/db";
import { fileExistsInR2 } from "@/lib/r2";
import { processLogFile } from "@/lib/workflow";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { file } = await requireFileById(id);

    // Non-admin can only retry their own files — return 404 to avoid leaking existence
    if (user.role !== "admin" && file.userId !== user.id) {
      throw Errors.notFound("File");
    }

    // Only failed files can be retried
    if (file.processingStatus !== "failed") {
      throw Errors.validation(
        `File cannot be retried — current status is "${file.processingStatus}"`,
      );
    }

    // Ensure the source file still exists in R2
    const exists = await fileExistsInR2(file.key);
    if (!exists) {
      throw Errors.validation(
        "Source file no longer exists in storage — cannot retry",
      );
    }

    // Delete partial data from the previous attempt
    await db.delete(logRecords).where(eq(logRecords.fileId, file.id));
    await db.delete(batchProgress).where(eq(batchProgress.fileId, file.id));

    // Reset file to pending state
    await db
      .update(files)
      .set({
        processingStatus: "pending",
        errorMessage: null,
        lastErrorAt: null,
        failedRecords: 0,
        recordCount: null,
        workflowRunId: null,
        processedAt: null,
      })
      .where(eq(files.id, file.id));

    // Start a new processing workflow
    const workflowRun = await start(processLogFile, [
      { fileId: file.id, fileKey: file.key },
    ]);

    // Persist the new workflow run reference
    await db
      .update(files)
      .set({ workflowRunId: workflowRun.runId })
      .where(eq(files.id, file.id));

    return success({ workflowRunId: workflowRun.runId });
  } catch (error) {
    return handleError(error, "Failed to retry file processing");
  }
}
