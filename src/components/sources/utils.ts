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

/**
 * Formats a raw source filename into a human-readable display name.
 * Strips `.ndjson` extension, replaces separators with spaces, and applies title casing.
 */
export function formatSourceName(filename: string): string {
  // Strip .ndjson extension (case-insensitive)
  let name = filename.replace(/\.ndjson$/i, "");

  // Replace underscores and hyphens with spaces (but preserve date-like patterns first)
  // e.g. "sanity-logs-2026-01-15" → "sanity logs 2026-01-15"
  // Temporarily protect date patterns (YYYY-MM-DD)
  const datePattern = /(\d{4})-(\d{2})-(\d{2})/g;
  const dates: string[] = [];
  name = name.replace(datePattern, (match) => {
    dates.push(match);
    return `__DATE${dates.length - 1}__`;
  });

  // Replace separators with spaces
  name = name.replace(/[_-]+/g, " ");

  // Restore date patterns
  name = name.replace(/__DATE(\d+)__/g, (_, i) => dates[Number(i)]);

  // Title-case each word (skip date tokens)
  name = name
    .split(" ")
    .map((word) => {
      // Don't capitalize date strings or already-uppercase abbreviations
      if (/^\d{4}-\d{2}-\d{2}$/.test(word) || /^\d+$/.test(word)) return word;
      if (word === word.toUpperCase() && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return name.trim();
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
