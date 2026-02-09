/**
 * Upload Progress SSE Endpoint
 *
 * Streams real-time upload progress for a session.
 * Uses Server-Sent Events for efficient push updates.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uploadSessions, uploadChunks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSessionOwner, handleError } from "@/lib/api";

// Poll interval in milliseconds
const POLL_INTERVAL = 500;

// Timeout for SSE connection (5 minutes)
const CONNECTION_TIMEOUT = 5 * 60 * 1000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UploadProgressEvent {
  type: "progress" | "complete" | "error" | "cancelled";
  sessionId: string;
  filename: string;
  totalBytes: number;
  bytesUploaded: number;
  totalChunks: number;
  uploadedChunks: number;
  percentComplete: number;
  status: string;
  estimatedSecondsRemaining: number | null;
  bytesPerSecond: number | null;
  chunks?: {
    chunkNumber: number;
    status: string;
    size: number;
  }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await params;

  // Auth + ownership check (one-time at connection)
  try {
    await requireSessionOwner(sessionId);
  } catch (error) {
    return handleError(error, "Upload session not found");
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let lastBytesUploaded = 0;
  let lastTimestamp = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`),
      );

      // Set connection timeout
      timeoutId = setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "timeout" })}\n\n`),
        );
        controller.close();
      }, CONNECTION_TIMEOUT);

      // Poll for updates
      intervalId = setInterval(async () => {
        try {
          // Get session data
          const session = await db.query.uploadSessions.findFirst({
            where: eq(uploadSessions.id, sessionId),
          });

          if (!session) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: "Session not found" })}\n\n`,
              ),
            );
            cleanup();
            controller.close();
            return;
          }

          // Get chunk statuses
          const chunks = await db
            .select({
              chunkNumber: uploadChunks.chunkNumber,
              status: uploadChunks.status,
              size: uploadChunks.size,
            })
            .from(uploadChunks)
            .where(eq(uploadChunks.sessionId, sessionId));

          // Calculate speed
          const now = Date.now();
          const timeDelta = (now - lastTimestamp) / 1000;
          const bytesDelta = session.bytesUploaded - lastBytesUploaded;
          const bytesPerSecond = timeDelta > 0 ? bytesDelta / timeDelta : null;

          lastBytesUploaded = session.bytesUploaded;
          lastTimestamp = now;

          // Calculate ETA
          let estimatedSecondsRemaining: number | null = null;
          if (bytesPerSecond && bytesPerSecond > 0) {
            const remainingBytes = session.totalSize - session.bytesUploaded;
            estimatedSecondsRemaining = remainingBytes / bytesPerSecond;
          }

          // Calculate percentage
          const percentComplete =
            session.totalSize > 0
              ? Math.round((session.bytesUploaded / session.totalSize) * 100)
              : 0;

          // Determine event type based on status
          let eventType: UploadProgressEvent["type"] = "progress";
          if (session.status === "uploaded" || session.status === "completed") {
            eventType = "complete";
          } else if (session.status === "failed") {
            eventType = "error";
          } else if (session.status === "cancelled") {
            eventType = "cancelled";
          }

          const event: UploadProgressEvent = {
            type: eventType,
            sessionId,
            filename: session.filename,
            totalBytes: session.totalSize,
            bytesUploaded: session.bytesUploaded,
            totalChunks: session.totalChunks,
            uploadedChunks: session.uploadedChunks,
            percentComplete,
            status: session.status,
            estimatedSecondsRemaining,
            bytesPerSecond,
            chunks,
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

          // Close stream if upload is complete or failed
          if (
            session.status === "uploaded" ||
            session.status === "completed" ||
            session.status === "failed" ||
            session.status === "cancelled"
          ) {
            cleanup();
            controller.close();
          }
        } catch (error) {
          console.error("Error polling upload progress:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Internal error" })}\n\n`,
            ),
          );
        }
      }, POLL_INTERVAL);

      function cleanup() {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        cleanup();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
