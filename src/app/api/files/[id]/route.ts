import { handleError, requireFileById, success } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { file } = await requireFileById(id);

    return success({
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
    return handleError(error, "Failed to fetch file");
  }
}
