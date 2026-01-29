"use step";

import { deleteFile } from "@/lib/r2";

export async function deleteFromR2({ fileKey }: { fileKey: string }) {
  await deleteFile(fileKey);
}
