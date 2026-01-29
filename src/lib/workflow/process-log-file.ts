"use workflow";

import { markProcessing } from "./steps/mark-processing";
import { processRecords } from "./steps/process-records";
import { markComplete } from "./steps/mark-complete";
import { deleteFromR2 } from "./steps/delete-from-r2";

export interface ProcessLogFileInput {
  fileId: string;
  fileKey: string;
}

export async function processLogFile(input: ProcessLogFileInput) {
  const { fileId, fileKey } = input;

  await markProcessing({ fileId });
  const { recordCount } = await processRecords({ fileId, fileKey });
  await markComplete({ fileId, recordCount });
  await deleteFromR2({ fileKey });

  return { success: true, fileId, recordCount };
}
