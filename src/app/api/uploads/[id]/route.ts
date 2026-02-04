import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadSessions, uploadChunks, files } from "@/lib/db/schema";
import { abortMultipartUpload } from "@/lib/r2";
import { eq, and } from "drizzle-orm";

// ============================================================================
// GET /api/uploads/:id - Get upload session status
// ============================================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await db.query.uploadSessions.findFirst({
      where: eq(uploadSessions.id, id),
    });

    if (!session) {
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

    // Get chunk statuses
    const chunks = await db
      .select()
      .from(uploadChunks)
      .where(eq(uploadChunks.sessionId, id))
      .orderBy(uploadChunks.chunkNumber);

    // Calculate progress
    const completedChunks = chunks.filter((c) => c.status === "completed");
    const failedChunks = chunks.filter((c) => c.status === "failed");
    const pendingChunks = chunks.filter((c) => c.status === "pending");
    const uploadingChunks = chunks.filter((c) => c.status === "uploading");

    const progress = {
      percentage:
        session.totalChunks > 0
          ? Math.round((completedChunks.length / session.totalChunks) * 100)
          : 0,
      bytesUploaded: session.bytesUploaded,
      totalBytes: session.totalSize,
      chunksCompleted: completedChunks.length,
      chunksFailed: failedChunks.length,
      chunksPending: pendingChunks.length,
      chunksUploading: uploadingChunks.length,
      totalChunks: session.totalChunks,
    };

    // Check if session is expired
    const isExpired = new Date(session.expiresAt) < new Date();

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          fileId: session.fileId,
          filename: session.filename,
          status: isExpired ? "expired" : session.status,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          errorMessage: session.errorMessage,
        },
        progress,
        chunks: chunks.map((c) => ({
          chunkNumber: c.chunkNumber,
          status: c.status,
          size: c.size,
          byteStart: c.byteStart,
          byteEnd: c.byteEnd,
          etag: c.etag,
          attempts: c.attempts,
          errorMessage: c.errorMessage,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to get upload session:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get upload session",
        },
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/uploads/:id - Cancel upload session
// ============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await db.query.uploadSessions.findFirst({
      where: eq(uploadSessions.id, id),
    });

    if (!session) {
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

    // Can only cancel sessions that are not completed
    if (session.status === "completed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: "Cannot cancel a completed upload",
          },
        },
        { status: 400 },
      );
    }

    // Abort the multipart upload in R2
    try {
      await abortMultipartUpload(session.r2Key, session.r2UploadId);
    } catch (r2Error) {
      // Log but don't fail - the upload might already be aborted
      console.warn("Failed to abort multipart upload in R2:", r2Error);
    }

    // Update session status
    await db
      .update(uploadSessions)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(uploadSessions.id, id));

    // Update file status
    if (session.fileId) {
      await db
        .update(files)
        .set({
          processingStatus: "failed",
          errorMessage: "Upload cancelled by user",
        })
        .where(eq(files.id, session.fileId));
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        status: "cancelled",
      },
    });
  } catch (error) {
    console.error("Failed to cancel upload session:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to cancel upload session",
        },
      },
      { status: 500 },
    );
  }
}
