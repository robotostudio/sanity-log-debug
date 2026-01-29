import { NextResponse } from "next/server";
import { deleteFile, getPresignedUploadUrl, listFiles } from "@/lib/r2";

// GET - List all uploaded files
export async function GET() {
  try {
    const files = await listFiles();
    return NextResponse.json({ files });
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

// DELETE - Delete a file
export async function DELETE(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    await deleteFile(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}
