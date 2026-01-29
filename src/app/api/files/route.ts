import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { db, files, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { deleteFile, getPresignedUploadUrl } from "@/lib/r2";
import { processLogFile } from "@/lib/workflow";

const logger = new Logger("api/files");

// GET - List all files from database (primary source of truth)
// R2 files are deleted after processing, so DB is the reliable source
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
    return NextResponse.json({ files: filesList });
  } catch (error) {
    logger.error("Failed to list files", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 },
    );
  }
}

// POST - Get presigned upload URL
export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    logger.info("Getting presigned URL", { filename });

    if (!filename || !filename.endsWith(".ndjson")) {
      logger.warn("Invalid filename", { filename });
      return NextResponse.json(
        { error: "Filename must end with .ndjson" },
        { status: 400 },
      );
    }

    const { url, key } = await getPresignedUploadUrl(filename);
    logger.info("Presigned URL generated", { key });
    return NextResponse.json({ url, key });
  } catch (error) {
    logger.error("Failed to get upload URL", error);
    return NextResponse.json(
      { error: "Failed to get upload URL" },
      { status: 500 },
    );
  }
}

// PUT - Confirm upload complete and trigger processing
export async function PUT(request: Request) {
  try {
    const { key, filename, size } = await request.json();
    logger.info("Confirming upload", { key, filename, size });

    if (!key) {
      logger.warn("PUT called without key");
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const fileId = crypto.randomUUID();

    // Create file record first (so we have a record even if workflow fails to start)
    await db.insert(files).values({
      id: fileId,
      key,
      filename: filename || key.split("/").pop() || key,
      size: size || 0,
      processingStatus: "pending",
    });
    logger.info("File record created", { fileId, key });

    // Start the workflow and update file with run ID
    let workflowRunId: string | null = null;
    try {
      const workflowRun = await start(processLogFile, [
        { fileId, fileKey: key },
      ]);
      workflowRunId = workflowRun.runId;
      logger.info("Processing workflow started", { fileId, workflowRunId });

      // Update file record with workflow run ID
      await db.update(files).set({ workflowRunId }).where(eq(files.id, fileId));
    } catch (workflowError) {
      logger.error("Failed to start workflow", {
        fileId,
        error: workflowError,
      });
      // Mark file as failed since workflow couldn't start
      await db
        .update(files)
        .set({ processingStatus: "failed" })
        .where(eq(files.id, fileId));
      throw workflowError;
    }

    return NextResponse.json({
      success: true,
      fileId,
      workflowRunId,
      processingStatus: "pending",
    });
  } catch (error) {
    logger.error("Failed to confirm upload", error);
    return NextResponse.json(
      { error: "Failed to confirm upload" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a file and its associated log records
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { key } = body;

    logger.info("DELETE request", { key });

    if (!key) {
      logger.warn("DELETE called without key");
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // Find the file record first
    const fileRecord = await db.query.files.findFirst({
      where: eq(files.key, key),
    });

    logger.info("File record lookup", {
      found: !!fileRecord,
      fileId: fileRecord?.id,
    });

    if (!fileRecord) {
      logger.warn("File not found", { key });
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete associated log records first (foreign key constraint)
    logger.info("Deleting log records", { fileId: fileRecord.id });
    await db.delete(logRecords).where(eq(logRecords.fileId, fileRecord.id));
    logger.info("Log records deleted");

    // Delete the file record from database
    logger.info("Deleting file record", { key });
    await db.delete(files).where(eq(files.key, key));
    logger.info("File record deleted");

    // Try to delete from R2 (idempotent - may already be deleted by workflow)
    await deleteFile(key).catch((r2Error) => {
      logger.warn("R2 delete skipped (may already be deleted)", r2Error);
    });
    logger.info("R2 file deletion attempted");

    logger.info("File deletion complete", { key });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete file", error);
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    };
    return NextResponse.json(
      {
        error: "Failed to delete file",
        details: errorDetails,
      },
      { status: 500 },
    );
  }
}
