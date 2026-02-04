import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export const BUCKET_NAME = env.R2_BUCKET_NAME;

export interface R2File {
  key: string;
  size: number;
  lastModified: Date;
}

export async function listFiles(): Promise<R2File[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "logs/",
  });

  const response = await r2Client.send(command);

  return (response.Contents ?? [])
    .filter((obj): obj is typeof obj & { Key: string } =>
      Boolean(obj.Key?.endsWith(".ndjson")),
    )
    .map((obj) => ({
      key: obj.Key,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified ?? new Date(),
    }));
}

export async function getPresignedUploadUrl(
  filename: string,
): Promise<{ url: string; key: string }> {
  const key = `logs/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: "application/x-ndjson",
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

  return { url, key };
}

export async function getFileContent(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  const body = await response.Body?.transformToString();

  if (!body) {
    throw new Error(`Failed to read file: ${key}`);
  }

  return body;
}

/**
 * Returns a ReadableStream for streaming large files line by line
 */
export async function getFileStream(
  key: string,
): Promise<ReadableStream<Uint8Array>> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  const stream = response.Body?.transformToWebStream();

  if (!stream) {
    throw new Error(`Failed to get stream for file: ${key}`);
  }

  return stream;
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

// ============================================================================
// Multipart Upload Functions (for large files up to 5GB+)
// ============================================================================

export interface MultipartUploadInit {
  uploadId: string;
  key: string;
}

export interface CompletedPart {
  ETag: string;
  PartNumber: number;
}

/**
 * Calculate optimal chunk size based on file size
 * Returns chunk size in bytes
 */
export function calculateChunkSize(fileSizeBytes: number): number {
  const MB = 1024 * 1024;
  const GB = 1024 * MB;

  if (fileSizeBytes < 100 * MB) return 10 * MB; // 10MB chunks for < 100MB files
  if (fileSizeBytes < 1 * GB) return 25 * MB; // 25MB chunks for 100MB - 1GB
  if (fileSizeBytes < 5 * GB) return 50 * MB; // 50MB chunks for 1GB - 5GB
  return 100 * MB; // 100MB chunks for > 5GB
}

/**
 * Calculate total number of chunks for a file
 */
export function calculateTotalChunks(
  fileSizeBytes: number,
  chunkSize: number,
): number {
  return Math.ceil(fileSizeBytes / chunkSize);
}

/**
 * Generate byte ranges for all chunks
 */
export function generateChunkRanges(
  fileSizeBytes: number,
  chunkSize: number,
): Array<{ chunkNumber: number; byteStart: number; byteEnd: number }> {
  const chunks: Array<{
    chunkNumber: number;
    byteStart: number;
    byteEnd: number;
  }> = [];
  let byteStart = 0;
  let chunkNumber = 1;

  while (byteStart < fileSizeBytes) {
    const byteEnd = Math.min(byteStart + chunkSize, fileSizeBytes);
    chunks.push({ chunkNumber, byteStart, byteEnd });
    byteStart = byteEnd;
    chunkNumber++;
  }

  return chunks;
}

/**
 * Initiate a multipart upload
 * Returns uploadId and key needed for subsequent operations
 */
export async function createMultipartUpload(
  filename: string,
  contentType = "text/csv",
): Promise<MultipartUploadInit> {
  const key = `logs/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${filename}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const response = await r2Client.send(command);

  if (!response.UploadId) {
    throw new Error("Failed to create multipart upload: no UploadId returned");
  }

  return {
    uploadId: response.UploadId,
    key,
  };
}

/**
 * Get a presigned URL for uploading a single part/chunk
 * Part numbers are 1-indexed (1 to 10,000)
 */
export async function getUploadPartPresignedUrl(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  // Presigned URL valid for 1 hour
  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  return url;
}

/**
 * List all uploaded parts for a multipart upload
 * Returns the parts with their ETags as stored in R2
 */
export async function listUploadedParts(
  key: string,
  uploadId: string,
): Promise<CompletedPart[]> {
  const parts: CompletedPart[] = [];

  console.log(`[R2] listUploadedParts: key=${key}, uploadId=${uploadId.substring(0, 20)}...`);

  try {
    const command = new ListPartsCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MaxParts: 1000, // Get up to 1000 parts at once
    });

    const response = await r2Client.send(command);

    console.log(`[R2] listUploadedParts: response received, Parts=${response.Parts?.length ?? 0}, IsTruncated=${response.IsTruncated}`);

    if (response.Parts) {
      for (const part of response.Parts) {
        console.log(`[R2] Part ${part.PartNumber}: ETag=${part.ETag}, Size=${part.Size}`);
        if (part.PartNumber && part.ETag) {
          parts.push({
            PartNumber: part.PartNumber,
            ETag: part.ETag,
          });
        }
      }
    }

    console.log(`[R2] listUploadedParts: found ${parts.length} total parts`);
    return parts.sort((a, b) => a.PartNumber - b.PartNumber);
  } catch (error) {
    console.error(`[R2] listUploadedParts failed:`, error);
    throw error;
  }
}

/**
 * Complete a multipart upload by combining all parts
 * Parts must be provided in order with their ETags
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: CompletedPart[],
): Promise<{ location: string; etag: string }> {
  // Sort parts by PartNumber to ensure correct order
  const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

  const command = new CompleteMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: sortedParts,
    },
  });

  const response = await r2Client.send(command);

  return {
    location: response.Location ?? `${BUCKET_NAME}/${key}`,
    etag: response.ETag ?? "",
  };
}

/**
 * Abort a multipart upload
 * Call this to clean up if an upload fails or is cancelled
 */
export async function abortMultipartUpload(
  key: string,
  uploadId: string,
): Promise<void> {
  const command = new AbortMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
  });

  await r2Client.send(command);
}

/**
 * Get file stream with byte range support for resume capability
 * Useful for resuming processing from a specific byte offset
 */
export async function getFileStreamWithRange(
  key: string,
  startByte?: number,
  endByte?: number,
): Promise<ReadableStream<Uint8Array>> {
  const range =
    startByte !== undefined
      ? `bytes=${startByte}-${endByte !== undefined ? endByte : ""}`
      : undefined;

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Range: range,
  });

  const response = await r2Client.send(command);
  const stream = response.Body?.transformToWebStream();

  if (!stream) {
    throw new Error(`Failed to get stream for file: ${key}`);
  }

  return stream;
}

/**
 * Get file metadata (size, content type, etc.)
 */
export async function getFileMetadata(
  key: string,
): Promise<{ size: number; contentType: string | undefined }> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);

  return {
    size: response.ContentLength ?? 0,
    contentType: response.ContentType,
  };
}
