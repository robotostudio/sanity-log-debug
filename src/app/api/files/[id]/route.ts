import { handleError, requireAuth, requireFileById, success, Errors } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { file } = await requireFileById(id);

    // Non-admin can only see own files — return 404 to avoid leaking existence
    if (user.role !== "admin" && file.userId !== user.id) {
      throw Errors.notFound("File");
    }

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
