import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, files } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const file = await db.query.files.findFirst({
      where: eq(files.id, id),
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: file.id,
      key: file.key,
      filename: file.filename,
      size: file.size,
      uploadedAt: file.uploadedAt.toISOString(),
      processingStatus: file.processingStatus,
      recordCount: file.recordCount,
      processedAt: file.processedAt?.toISOString() ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 },
    );
  }
}
