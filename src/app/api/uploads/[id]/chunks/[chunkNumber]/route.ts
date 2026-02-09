import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { uploadSessions, uploadChunks } from "@/lib/db/schema";
import { getUploadPartPresignedUrl } from "@/lib/r2";
import { eq, and } from "drizzle-orm";
import { Logger } from "@/lib/logger";
import { requireSessionOwner, handleError } from "@/lib/api";

const logger = new Logger("UploadChunk");

// ============================================================================
// Validation Schemas
// ============================================================================

const confirmChunkSchema = z.object({
  etag: z.string().optional(), // ETag is optional - we get actual ETags from R2 when completing
  size: z.number().int().positive().optional(),
  checksum: z.string().optional(),
});

// ============================================================================
// GET /api/uploads/:id/chunks/:chunkNumber - Get presigned URL for chunk
// ============================================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chunkNumber: string }> },
) {
  try {
    const { id, chunkNumber: chunkNumberStr } = await params;
    const chunkNumber = Number.parseInt(chunkNumberStr, 10);
    logger.info(`GET /api/uploads/${id}/chunks/${chunkNumber} - Getting presigned URL`);

    if (Number.isNaN(chunkNumber) || chunkNumber < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid chunk number",
          },
        },
        { status: 400 },
      );
    }

    // Get session (with auth + ownership check)
    const { session } = await requireSessionOwner(id);

    // Check session status
    if (session.status === "completed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: "Upload session is already completed",
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
            message: `Upload session is ${session.status}`,
          },
        },
        { status: 400 },
      );
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EXPIRED",
            message: "Upload session has expired",
          },
        },
        { status: 400 },
      );
    }

    // Get chunk
    const chunk = await db.query.uploadChunks.findFirst({
      where: and(
        eq(uploadChunks.sessionId, id),
        eq(uploadChunks.chunkNumber, chunkNumber),
      ),
    });

    if (!chunk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Chunk ${chunkNumber} not found`,
          },
        },
        { status: 404 },
      );
    }

    // Generate presigned URL
    const presignedUrl = await getUploadPartPresignedUrl(
      session.r2Key,
      session.r2UploadId,
      chunkNumber,
    );

    // Update chunk status to uploading
    await db
      .update(uploadChunks)
      .set({
        status: "uploading",
        attempts: chunk.attempts + 1,
        lastAttemptAt: new Date(),
      })
      .where(eq(uploadChunks.id, chunk.id));

    // Update session status if first chunk
    if (session.status === "created") {
      await db
        .update(uploadSessions)
        .set({
          status: "uploading",
          updatedAt: new Date(),
        })
        .where(eq(uploadSessions.id, id));
    }

    logger.info(`Chunk ${chunkNumber} presigned URL generated: ${presignedUrl.substring(0, 60)}...`);
    return NextResponse.json({
      success: true,
      data: {
        url: presignedUrl,
        chunkNumber,
        byteStart: chunk.byteStart,
        byteEnd: chunk.byteEnd,
        expectedSize: chunk.size,
        expiresIn: 3600, // 1 hour
      },
    });
  } catch (error) {
    return handleError(error, "Failed to get presigned URL");
  }
}

// ============================================================================
// POST /api/uploads/:id/chunks/:chunkNumber - Confirm chunk upload
// ============================================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; chunkNumber: string }> },
) {
  try {
    const { id, chunkNumber: chunkNumberStr } = await params;
    const chunkNumber = Number.parseInt(chunkNumberStr, 10);
    logger.info(`POST /api/uploads/${id}/chunks/${chunkNumber} - Confirming chunk upload`);

    if (Number.isNaN(chunkNumber) || chunkNumber < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid chunk number",
          },
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = confirmChunkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: validation.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const { etag, checksum } = validation.data;
    logger.info(`Chunk ${chunkNumber} confirm request: etag=${etag?.substring(0, 20) ?? 'none'}, checksum=${checksum ?? 'none'}`);

    // Get session (with auth + ownership check)
    const { session } = await requireSessionOwner(id);

    // Get chunk
    const chunk = await db.query.uploadChunks.findFirst({
      where: and(
        eq(uploadChunks.sessionId, id),
        eq(uploadChunks.chunkNumber, chunkNumber),
      ),
    });

    if (!chunk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Chunk ${chunkNumber} not found`,
          },
        },
        { status: 404 },
      );
    }

    // Update chunk as completed
    await db
      .update(uploadChunks)
      .set({
        status: "completed",
        etag: etag ?? null, // ETag is optional - we get actual ETags from R2 when completing
        checksum: checksum ?? null,
      })
      .where(eq(uploadChunks.id, chunk.id));

    // Update session progress
    const newUploadedChunks = session.uploadedChunks + 1;
    const newBytesUploaded = session.bytesUploaded + chunk.size;

    await db
      .update(uploadSessions)
      .set({
        uploadedChunks: newUploadedChunks,
        bytesUploaded: newBytesUploaded,
        updatedAt: new Date(),
      })
      .where(eq(uploadSessions.id, id));

    // Check if all chunks are complete
    const allChunksComplete = newUploadedChunks >= session.totalChunks;

    return NextResponse.json({
      success: true,
      data: {
        chunkNumber,
        status: "completed",
        progress: {
          uploadedChunks: newUploadedChunks,
          totalChunks: session.totalChunks,
          bytesUploaded: newBytesUploaded,
          totalBytes: session.totalSize,
          percentage: Math.round(
            (newUploadedChunks / session.totalChunks) * 100,
          ),
          allChunksComplete,
        },
      },
    });
  } catch (error) {
    return handleError(error, "Failed to confirm chunk upload");
  }
}

// ============================================================================
// PATCH /api/uploads/:id/chunks/:chunkNumber - Mark chunk as failed
// ============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; chunkNumber: string }> },
) {
  try {
    const { id, chunkNumber: chunkNumberStr } = await params;
    const chunkNumber = Number.parseInt(chunkNumberStr, 10);
    logger.info(`PATCH /api/uploads/${id}/chunks/${chunkNumber} - Marking chunk as failed`);

    // Auth + ownership check
    await requireSessionOwner(id);

    if (Number.isNaN(chunkNumber) || chunkNumber < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid chunk number",
          },
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { errorMessage } = body;

    // Get chunk
    const chunk = await db.query.uploadChunks.findFirst({
      where: and(
        eq(uploadChunks.sessionId, id),
        eq(uploadChunks.chunkNumber, chunkNumber),
      ),
    });

    if (!chunk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Chunk ${chunkNumber} not found`,
          },
        },
        { status: 404 },
      );
    }

    // Mark chunk as failed (but allow retry)
    await db
      .update(uploadChunks)
      .set({
        status: "failed",
        errorMessage: errorMessage ?? "Upload failed",
      })
      .where(eq(uploadChunks.id, chunk.id));

    return NextResponse.json({
      success: true,
      data: {
        chunkNumber,
        status: "failed",
        canRetry: chunk.attempts < 5, // Allow up to 5 attempts
      },
    });
  } catch (error) {
    return handleError(error, "Failed to update chunk status");
  }
}
