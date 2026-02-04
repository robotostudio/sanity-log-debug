import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { db } from "@/lib/db";
import {
  uploadSessions,
  uploadChunks,
  files,
} from "@/lib/db/schema";
import { completeMultipartUpload, listUploadedParts, type CompletedPart } from "@/lib/r2";
import { Logger } from "@/lib/logger";
import { processLogFile } from "@/lib/workflow";

const logger = new Logger("UploadComplete");

// ============================================================================
// POST /api/uploads/:id/complete - Complete multipart upload
// ============================================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info(`POST /api/uploads/${id}/complete - Starting completion`);

    // Get session
    const session = await db.query.uploadSessions.findFirst({
      where: eq(uploadSessions.id, id),
    });

    if (!session) {
      logger.error(`Session ${id} not found`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Upload session not found",
          },
        },
        { status: 404 },
      );
    }

    logger.info(`Session found: status=${session.status}, totalChunks=${session.totalChunks}, r2Key=${session.r2Key}`);

    // Check session status
    if (session.status === "completed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: "Upload is already completed",
          },
        },
        { status: 400 },
      );
    }

    if (session.status === "cancelled" || session.status === "failed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: `Cannot complete ${session.status} upload`,
          },
        },
        { status: 400 },
      );
    }

    // Get all chunks
    const chunks = await db
      .select()
      .from(uploadChunks)
      .where(eq(uploadChunks.sessionId, id))
      .orderBy(uploadChunks.chunkNumber);

    // Verify all chunks are completed
    const incompleteChunks = chunks.filter((c) => c.status !== "completed");
    if (incompleteChunks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INCOMPLETE",
            message: `${incompleteChunks.length} chunk(s) are not completed`,
            details: {
              incompleteChunks: incompleteChunks.map((c) => ({
                chunkNumber: c.chunkNumber,
                status: c.status,
              })),
            },
          },
        },
        { status: 400 },
      );
    }

    // Note: We no longer check for ETags in the database
    // We get actual ETags from R2 directly when completing the upload
    // This avoids CORS issues where browser can't access ETag header

    // Update session to completing
    await db
      .update(uploadSessions)
      .set({
        status: "completing",
        updatedAt: new Date(),
      })
      .where(eq(uploadSessions.id, id));

    // Get actual ETags from R2 (browser can't access them due to CORS)
    logger.info(`Listing uploaded parts for session ${id}`);
    let parts: CompletedPart[];
    try {
      parts = await listUploadedParts(session.r2Key, session.r2UploadId);
      logger.info(`Found ${parts.length} parts in R2:`, parts.map(p => ({ PartNumber: p.PartNumber, ETag: p.ETag?.substring(0, 20) })));
    } catch (listError) {
      logger.error("Failed to list uploaded parts:", listError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "R2_ERROR",
            message: "Failed to verify uploaded parts",
          },
        },
        { status: 500 },
      );
    }

    // Verify we have the expected number of parts
    if (parts.length !== session.totalChunks) {
      logger.error(`Part count mismatch: expected ${session.totalChunks}, found ${parts.length}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INCOMPLETE",
            message: `Expected ${session.totalChunks} parts, but found ${parts.length} in storage`,
          },
        },
        { status: 400 },
      );
    }

    let r2Result: { location: string; etag: string };
    try {
      logger.info(`Completing multipart upload with ${parts.length} parts`);
      r2Result = await completeMultipartUpload(
        session.r2Key,
        session.r2UploadId,
        parts,
      );
      logger.info(`Multipart upload completed: ${r2Result.location}`);
    } catch (r2Error) {
      logger.error("Failed to complete multipart upload in R2:", r2Error);

      // Update session to failed
      await db
        .update(uploadSessions)
        .set({
          status: "failed",
          errorMessage:
            r2Error instanceof Error
              ? r2Error.message
              : "Failed to complete multipart upload",
          updatedAt: new Date(),
        })
        .where(eq(uploadSessions.id, id));

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "R2_ERROR",
            message: "Failed to complete multipart upload in storage",
          },
        },
        { status: 500 },
      );
    }

    // Update session to completed
    await db
      .update(uploadSessions)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(uploadSessions.id, id));

    // Update file status to pending processing
    if (session.fileId) {
      await db
        .update(files)
        .set({
          processingStatus: "pending",
        })
        .where(eq(files.id, session.fileId));
    }

    // Start processing workflow
    let workflowRunId: string | null = null;
    try {
      logger.info(`Starting processing workflow for file ${session.fileId}`);
      const workflowRun = await start(processLogFile, [
        { fileId: session.fileId!, fileKey: session.r2Key },
      ]);
      workflowRunId = workflowRun.runId;
      logger.info(`Processing workflow started`, { fileId: session.fileId, workflowRunId });

      // Update file with workflow reference
      await db
        .update(files)
        .set({ workflowRunId })
        .where(eq(files.id, session.fileId!));
    } catch (workflowError) {
      logger.error("Failed to start processing workflow", {
        fileId: session.fileId,
        error: workflowError,
      });
      // Mark file as failed if workflow couldn't start
      await db
        .update(files)
        .set({ processingStatus: "failed", errorMessage: "Failed to start processing workflow" })
        .where(eq(files.id, session.fileId!));
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        fileId: session.fileId,
        status: "completed",
        workflowRunId,
        r2: {
          location: r2Result.location,
          etag: r2Result.etag,
          key: session.r2Key,
        },
        stats: {
          totalChunks: chunks.length,
          totalBytes: session.totalSize,
          filename: session.filename,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to complete upload:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to complete upload",
        },
      },
      { status: 500 },
    );
  }
}
