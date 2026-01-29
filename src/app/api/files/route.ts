import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { db, files } from "@/lib/db";
import { deleteFile, getPresignedUploadUrl, listFiles } from "@/lib/r2";
import { processLogFile } from "@/lib/workflow";

// GET - List all files from database (primary source of truth)
// R2 files are deleted after processing, so DB is the reliable source
export async function GET() {
  try {
    // Get all files from database
    const dbFiles = await db.query.files.findMany({
      orderBy: (files, { desc }) => [desc(files.uploadedAt)],
    });

    // Map to expected format
    const filesList = dbFiles.map((file) => ({
      key: file.key,
      size: file.size,
      lastModified: file.uploadedAt.toISOString(),
      processingStatus: file.processingStatus,
      recordCount: file.recordCount,
      filename: file.filename,
      id: file.id,
    }));

    return NextResponse.json({ files: filesList });
  } catch (error) {
    console.error("Failed to list files:", error);
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

    if (!filename || !filename.endsWith(".ndjson")) {
      return NextResponse.json(
        { error: "Filename must end with .ndjson" },
        { status: 400 },
      );
    }

    const { url, key } = await getPresignedUploadUrl(filename);
    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("Failed to get upload URL:", error);
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

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // Generate a unique ID for the file record
    const fileId = crypto.randomUUID();

    // Create file record in database
    await db.insert(files).values({
      id: fileId,
      key,
      filename: filename || key.split("/").pop() || key,
      size: size || 0,
      processingStatus: "pending",
    });

    // Trigger background processing via workflow
    await start(processLogFile, [{ fileId, fileKey: key }]);

    return NextResponse.json({
      success: true,
      fileId,
      processingStatus: "pending",
    });
  } catch (error) {
    console.error("Failed to confirm upload:", error);
    return NextResponse.json(
      { error: "Failed to confirm upload" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a file
export async function DELETE(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // Delete from R2
    await deleteFile(key);

    // Delete from database
    await db.delete(files).where(eq(files.key, key));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
