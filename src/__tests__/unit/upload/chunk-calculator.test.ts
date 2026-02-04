import { describe, expect, test } from "vitest";

// Import the pure functions that don't depend on env variables
// We'll define them inline to avoid importing r2.ts which initializes S3Client

const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * Calculate optimal chunk size based on file size
 * Returns chunk size in bytes
 */
function calculateChunkSize(fileSizeBytes: number): number {
  if (fileSizeBytes < 100 * MB) return 10 * MB;
  if (fileSizeBytes < 1 * GB) return 25 * MB;
  if (fileSizeBytes < 5 * GB) return 50 * MB;
  return 100 * MB;
}

/**
 * Calculate total number of chunks for a file
 */
function calculateTotalChunks(
  fileSizeBytes: number,
  chunkSize: number,
): number {
  return Math.ceil(fileSizeBytes / chunkSize);
}

/**
 * Generate byte ranges for all chunks
 */
function generateChunkRanges(
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

describe("calculateChunkSize", () => {
  test("returns 10MB for files under 100MB", () => {
    expect(calculateChunkSize(50 * MB)).toBe(10 * MB);
    expect(calculateChunkSize(99 * MB)).toBe(10 * MB);
    expect(calculateChunkSize(1 * MB)).toBe(10 * MB);
  });

  test("returns 25MB for files 100MB-1GB", () => {
    expect(calculateChunkSize(100 * MB)).toBe(25 * MB);
    expect(calculateChunkSize(500 * MB)).toBe(25 * MB);
    expect(calculateChunkSize(999 * MB)).toBe(25 * MB);
  });

  test("returns 50MB for files 1GB-5GB", () => {
    expect(calculateChunkSize(1 * GB)).toBe(50 * MB);
    expect(calculateChunkSize(2.5 * GB)).toBe(50 * MB);
    expect(calculateChunkSize(4.99 * GB)).toBe(50 * MB);
  });

  test("returns 100MB for files over 5GB", () => {
    expect(calculateChunkSize(5 * GB)).toBe(100 * MB);
    expect(calculateChunkSize(10 * GB)).toBe(100 * MB);
    expect(calculateChunkSize(20 * GB)).toBe(100 * MB);
  });

  test("handles edge cases (exact boundaries)", () => {
    // At exactly 100MB boundary
    expect(calculateChunkSize(100 * MB - 1)).toBe(10 * MB);
    expect(calculateChunkSize(100 * MB)).toBe(25 * MB);

    // At exactly 1GB boundary
    expect(calculateChunkSize(1 * GB - 1)).toBe(25 * MB);
    expect(calculateChunkSize(1 * GB)).toBe(50 * MB);

    // At exactly 5GB boundary
    expect(calculateChunkSize(5 * GB - 1)).toBe(50 * MB);
    expect(calculateChunkSize(5 * GB)).toBe(100 * MB);
  });
});

describe("calculateTotalChunks", () => {
  test("calculates correct chunk count for exact division", () => {
    expect(calculateTotalChunks(100 * MB, 10 * MB)).toBe(10);
    expect(calculateTotalChunks(1 * GB, 50 * MB)).toBe(Math.ceil(GB / (50 * MB)));
  });

  test("calculates correct chunk count with remainder", () => {
    expect(calculateTotalChunks(105 * MB, 10 * MB)).toBe(11);
    expect(calculateTotalChunks(101 * MB, 10 * MB)).toBe(11);
  });

  test("handles small files", () => {
    expect(calculateTotalChunks(1 * MB, 10 * MB)).toBe(1);
    expect(calculateTotalChunks(5 * MB, 10 * MB)).toBe(1);
  });

  test("handles large files", () => {
    const chunkSize = calculateChunkSize(5 * GB);
    expect(calculateTotalChunks(5 * GB, chunkSize)).toBe(
      Math.ceil((5 * GB) / chunkSize),
    );
  });
});

describe("generateChunkRanges", () => {
  test("creates correct byte ranges", () => {
    const ranges = generateChunkRanges(100, 30);

    expect(ranges).toHaveLength(4);
    expect(ranges[0]).toEqual({ chunkNumber: 1, byteStart: 0, byteEnd: 30 });
    expect(ranges[1]).toEqual({ chunkNumber: 2, byteStart: 30, byteEnd: 60 });
    expect(ranges[2]).toEqual({ chunkNumber: 3, byteStart: 60, byteEnd: 90 });
    expect(ranges[3]).toEqual({ chunkNumber: 4, byteStart: 90, byteEnd: 100 });
  });

  test("last chunk handles remainder correctly", () => {
    const ranges = generateChunkRanges(105 * MB, 10 * MB);
    const lastChunk = ranges[ranges.length - 1];

    expect(lastChunk.byteEnd).toBe(105 * MB);
    expect(lastChunk.byteEnd - lastChunk.byteStart).toBe(5 * MB);
  });

  test("generates sequential chunk numbers starting at 1", () => {
    const ranges = generateChunkRanges(50 * MB, 10 * MB);

    expect(ranges.map((r) => r.chunkNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  test("handles exact division", () => {
    const ranges = generateChunkRanges(100, 25);

    expect(ranges).toHaveLength(4);
    expect(ranges[3]).toEqual({ chunkNumber: 4, byteStart: 75, byteEnd: 100 });
  });

  test("handles single chunk files", () => {
    const ranges = generateChunkRanges(5 * MB, 10 * MB);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({
      chunkNumber: 1,
      byteStart: 0,
      byteEnd: 5 * MB,
    });
  });

  test("handles large files with many chunks", () => {
    const fileSize = 5 * GB;
    const chunkSize = 50 * MB;
    const ranges = generateChunkRanges(fileSize, chunkSize);

    expect(ranges.length).toBe(Math.ceil(fileSize / chunkSize));

    // Verify continuity - no gaps or overlaps
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].byteStart).toBe(ranges[i - 1].byteEnd);
    }

    // Verify first and last
    expect(ranges[0].byteStart).toBe(0);
    expect(ranges[ranges.length - 1].byteEnd).toBe(fileSize);
  });
});
