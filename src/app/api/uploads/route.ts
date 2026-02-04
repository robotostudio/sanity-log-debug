import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("Upload");
import {
  uploadSessions,
  uploadChunks,
  files,
  type NewUploadSession,
  type NewUploadChunk,
} from "@/lib/db/schema";
import {
  createMultipartUpload,
  calculateChunkSize,
  calculateTotalChunks,
  generateChunkRanges,
  getUploadPartPresignedUrl,
} from "@/lib/r2";
import { eq } from "drizzle-orm";

// ============================================================================
// Validation Schemas
// ============================================================================

const createUploadSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/\.csv$/i, "File must be a CSV file"),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024 * 1024, "File size cannot exceed 10GB"),
  contentType: z.string().optional().default("text/csv"),
});

// ============================================================================
// POST /api/uploads - Create new upload session
// ============================================================================

export async function POST(request: Request) {
  try {
    logger.info("POST /api/uploads - Creating new upload session");
    const body = await request.json();
    logger.info(`Request body: filename=${body.filename}, size=${body.size}, contentType=${body.contentType}`);
    const validation = createUploadSchema.safeParse(body);

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

    const { filename, size, contentType } = validation.data;

    // Calculate chunk configuration
    const chunkSize = calculateChunkSize(size);
    const totalChunks = calculateTotalChunks(size, chunkSize);
    const chunkRanges = generateChunkRanges(size, chunkSize);

    // Create multipart upload in R2
    const { uploadId, key } = await createMultipartUpload(filename, contentType);

    // Generate IDs
    const sessionId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create file record (pending status)
    await db.insert(files).values({
      id: fileId,
      key,
      filename,
      size,
      processingStatus: "pending",
    });

    // Create upload session
    const newSession: NewUploadSession = {
      id: sessionId,
      fileId,
      r2UploadId: uploadId,
      r2Key: key,
      filename,
      totalSize: size,
      chunkSize,
      totalChunks,
      uploadedChunks: 0,
      bytesUploaded: 0,
      status: "created",
      expiresAt,
      metadata: { contentType },
    };

    await db.insert(uploadSessions).values(newSession);

    // Create chunk records
    const chunkRecords: NewUploadChunk[] = chunkRanges.map((range) => ({
      sessionId,
      chunkNumber: range.chunkNumber,
      size: range.byteEnd - range.byteStart,
      byteStart: range.byteStart,
      byteEnd: range.byteEnd,
      status: "pending",
      attempts: 0,
    }));

    await db.insert(uploadChunks).values(chunkRecords);

    // Generate presigned URLs for all chunks
    logger.info(`Generating presigned URLs for ${chunkRanges.length} chunks`);
    const chunksWithUrls = await Promise.all(
      chunkRanges.map(async (r) => {
        const presignedUrl = await getUploadPartPresignedUrl(key, uploadId, r.chunkNumber);
        logger.info(`Chunk ${r.chunkNumber}: presignedUrl generated (${presignedUrl.substring(0, 60)}...)`);
        return {
          chunkNumber: r.chunkNumber,
          byteStart: r.byteStart,
          byteEnd: r.byteEnd,
          size: r.byteEnd - r.byteStart,
          presignedUrl,
        };
      }),
    );

    logger.info(`Session ${sessionId} created successfully with ${chunksWithUrls.length} chunks`);

    const responseData = {
      sessionId,
      fileId,
      r2UploadId: uploadId,
      chunkSize,
      totalChunks,
      expiresAt: expiresAt.toISOString(),
      chunks: chunksWithUrls,
    };

    logger.info(`Response data: sessionId=${responseData.sessionId}, chunks=${responseData.chunks.length}`);
    logger.info(`First chunk presignedUrl exists: ${!!responseData.chunks[0]?.presignedUrl}`);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error("Failed to create upload session:", error);
    logger.error("Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create upload session",
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET /api/uploads - List upload sessions (optional, for admin)
// ============================================================================

export async function GET() {
  try {
    const sessions = await db
      .select()
      .from(uploadSessions)
      .orderBy(uploadSessions.createdAt);

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Failed to list upload sessions:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list upload sessions",
        },
      },
      { status: 500 },
    );
  }
}
