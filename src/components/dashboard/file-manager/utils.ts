const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;
const BYTES_PER_UNIT = 1024;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const unitIndex = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT));
  const value = bytes / BYTES_PER_UNIT ** unitIndex;

  return `${value.toFixed(1)} ${BYTE_UNITS[unitIndex]}`;
}

export function getFileName(key: string): string {
  return key.split("/").pop() ?? key;
}

export function truncateFileName(key: string, maxLength = 20): string {
  const fileName = getFileName(key);
  if (fileName.length <= maxLength) return fileName;
  return `${fileName.substring(0, maxLength)}...`;
}

export function isValidNdjsonFile(file: File): boolean {
  return file.name.endsWith(".ndjson");
}
