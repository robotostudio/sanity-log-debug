import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
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
  const key = `logs/${Date.now()}-${filename}`;

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

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}
