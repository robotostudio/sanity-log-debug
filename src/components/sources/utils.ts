const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;
const BYTES_PER_UNIT = 1024;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  let unitIndex = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT));
  // Clamp unitIndex to valid range
  unitIndex = Math.min(unitIndex, BYTE_UNITS.length - 1);

  const value = bytes / BYTES_PER_UNIT ** unitIndex;

  return `${value.toFixed(1)} ${BYTE_UNITS[unitIndex]}`;
}

export function getFileName(key: string): string {
  return key.split("/").pop() ?? key;
}

export function isValidNdjsonFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".ndjson");
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
