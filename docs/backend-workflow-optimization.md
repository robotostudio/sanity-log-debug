# Backend CSV Processing Workflow Optimization

## Overview

This document describes the optimization of the CSV processing workflow from O(N²) to O(N) time complexity using **byte offset indexing with R2 Range requests**.

---

## The Problem: O(N²) File Reading

### Original Implementation

The original workflow had a critical performance bottleneck:

1. `countLines()` - Streams entire file to count lines (O(N))
2. `readBatchFromFile(startLine, endLine)` - For each batch, **re-reads from file start** and skips lines until reaching the batch range

```
Batch 0: read B lines     (skip 0)
Batch 1: read 2B lines    (skip B, process B)
Batch 2: read 3B lines    (skip 2B, process B)
...
Batch K: read N lines     (skip N-B, process B)

Total lines read = B + 2B + 3B + ... + KB
                 = B × (1 + 2 + ... + K)
                 = B × K(K+1)/2
                 = O(N²/B)
                 = O(N²)  [B is constant]
```

### Impact

| File Size | Records | O(N²) Line Reads | O(N) Line Reads |
|-----------|---------|------------------|-----------------|
| 10 MB | 50K | ~1.25 billion | 50K |
| 100 MB | 500K | ~125 billion | 500K |
| 1 GB | 5M | ~12.5 trillion | 5M |

---

## The Solution: Byte Offset Indexing

### Key Insight

R2 (and S3) support HTTP Range headers, allowing direct byte-level seeking:

```http
GET /file HTTP/1.1
Range: bytes=12500-25000
```

Instead of re-reading from the start, we can **seek directly** to any batch's position.

### Implementation Strategy

1. **During `countLines()`**: Track byte offsets at batch boundaries
2. **Store byte ranges**: `{ byteStart, byteEnd, lineCount }` instead of line numbers
3. **Use Range requests**: Fetch only the bytes needed for each batch

```
File: [Header][---Batch 0---][---Batch 1---][---Batch 2---]
      ^      ^              ^              ^              ^
      0      headerEnd      batch0End     batch1End     EOF

Batch 0: { byteStart: headerEnd, byteEnd: batch0End, lineCount: 5000 }
Batch 1: { byteStart: batch0End, byteEnd: batch1End, lineCount: 5000 }
```

---

## Complexity Analysis

### Time Complexity

| Operation | Before | After |
|-----------|--------|-------|
| `countLines()` | O(N) | O(N) |
| `readBatchFromFile()` per batch | **O(N)** | **O(B)** |
| All K batches | **O(K × N) = O(N²/B)** | **O(K × B) = O(N)** |
| DB inserts (parallel) | O(N) | O(N) |
| **Total** | **O(N²)** | **O(N)** |

### Space Complexity

| Component | Space |
|-----------|-------|
| Batch metadata | O(K) = O(N/B) |
| Records in memory | O(P × B) |
| **Total** | **O(N/B)** ≈ O(1) for constant B |

Where:
- N = total records
- B = batch size (5000)
- K = number of batches
- P = parallel batches (4)

---

## File Changes

### 1. `src/lib/r2.ts`

Already had `getFileStreamWithRange()` function:

```typescript
export async function getFileStreamWithRange(
  key: string,
  startByte?: number,
  endByte?: number,
): Promise<ReadableStream<Uint8Array>> {
  const range = startByte !== undefined
    ? `bytes=${startByte}-${endByte !== undefined ? endByte : ""}`
    : undefined;

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Range: range,
  });
  // ...
}
```

### 2. `src/lib/workflow/steps/create-batches.ts`

**BatchMetadata interface** - Changed from line numbers to byte offsets:

```typescript
export interface BatchMetadata {
  batchIndex: number;
  byteStart: number;  // Byte offset where batch data starts
  byteEnd: number;    // Byte offset where batch data ends
  lineCount: number;  // Number of data lines in this batch
}

export interface CountLinesResult {
  totalLines: number;
  batchSize: number;
  batches: BatchMetadata[];
  headers: string[];
  headerByteEnd: number;
}
```

**countLines()** - Now tracks byte offsets:

```typescript
export async function countLines({ fileKey }): Promise<CountLinesResult> {
  // Track byte offsets while streaming
  let currentByteOffset = 0;
  let headerByteEnd = 0;
  const batchBoundaries: { byteStart: number; lineCount: number }[] = [];

  // ... streaming logic that records byte positions at batch boundaries

  return {
    totalLines,
    batchSize: BATCH_SIZE,
    batches,  // Now contains byte ranges
    headers,
    headerByteEnd,
  };
}
```

**readBatchFromFile()** - Uses Range requests:

```typescript
export async function readBatchFromFile(
  fileKey: string,
  batch: BatchMetadata,
  headers: string[],
): Promise<ReadBatchResult> {
  // O(1) seek using Range header!
  const stream = await getFileStreamWithRange(
    fileKey,
    batch.byteStart,
    batch.byteEnd - 1
  );

  // Process only this batch's bytes
  // ...
}
```

### 3. `src/lib/workflow/steps/process-batch.ts`

**processBatch()** - Updated signature:

```typescript
export async function processBatch({
  fileId,
  fileKey,
  batch,
  headers,  // Now required
}: {
  fileId: string;
  fileKey: string;
  batch: BatchMetadata;
  headers: string[];
}): Promise<ProcessBatchResult> {
  // Uses byte-range based readBatchFromFile
  const { records, parseErrors } = await readBatchFromFile(
    fileKey,
    batch,
    headers,
  );
  // ...
}
```

**insertRecordsParallel()** - Parallel chunked inserts:

```typescript
async function insertRecordsParallel(
  dbRecords: DbRecord[],
  batchIndex: number,
): Promise<void> {
  // Split into 1000-record chunks
  const chunks = splitIntoChunks(dbRecords, DB_INSERT_CHUNK_SIZE);

  // Process 4 chunks in parallel
  for (let i = 0; i < chunks.length; i += MAX_PARALLEL_INSERTS) {
    const group = chunks.slice(i, i + MAX_PARALLEL_INSERTS);
    await Promise.all(group.map(chunk => insertChunk(chunk)));
  }
}
```

### 4. `src/lib/workflow/process-log-file.ts`

**processLogFile()** - Parallel batch processing:

```typescript
export async function processLogFile(input): Promise<ProcessLogFileResult> {
  // Get batch metadata with byte offsets
  const { batches, headers } = await countLines({ fileKey });

  // Process 4 batches in parallel
  for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
    const batchGroup = batches.slice(i, i + MAX_PARALLEL_BATCHES);

    await Promise.all(
      batchGroup.map(batch =>
        processBatch({ fileId, fileKey, batch, headers })
      )
    );
  }
}
```

---

## Configuration Constants

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `BATCH_SIZE` | 5000 | `create-batches.ts` | Records per batch |
| `MAX_PARALLEL_BATCHES` | 4 | `process-log-file.ts` | Concurrent batches |
| `DB_INSERT_CHUNK_SIZE` | 1000 | `process-batch.ts` | Records per DB insert |
| `MAX_PARALLEL_INSERTS` | 4 | `process-batch.ts` | Concurrent DB inserts |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CSV File in R2                          │
│  [Header Line][Batch 0 bytes][Batch 1 bytes][Batch 2 bytes]... │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      countLines() - O(N)                        │
│  • Single pass through file                                     │
│  • Records byte offset at each batch boundary                   │
│  • Returns: BatchMetadata[] with { byteStart, byteEnd }         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Parallel Batch Processing (4 at a time)            │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│  │  Batch 0    │ │  Batch 1    │ │  Batch 2    │ │  Batch 3   ││
│  │ Range: 0-5K │ │ Range: 5K-10K│ │Range: 10K-15K│ │Range: 15K+ ││
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘│
│         │               │               │               │       │
│         ▼               ▼               ▼               ▼       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              R2 Range Requests (Parallel)                   ││
│  │  GET /file Range: bytes=0-50000                             ││
│  │  GET /file Range: bytes=50001-100000                        ││
│  │  GET /file Range: bytes=100001-150000                       ││
│  │  GET /file Range: bytes=150001-200000                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Parallel DB Inserts (4 at a time)               │
│                                                                 │
│  Each batch: 5000 records → 5 chunks of 1000                    │
│  4 chunks insert in parallel → wait → next 1 chunk              │
│                                                                 │
│  Total: 4 batches × 5 chunks × 4 parallel = high throughput     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow System Constraints

### Why Not Use AsyncGenerator?

The `streamBatches()` function was initially implemented to yield batches as they're parsed (true single-pass streaming). However, the workflow system (Cloudflare Workflows) requires all step return values to be **serializable**.

```typescript
// This doesn't work - AsyncGenerator can't be serialized
async function* streamBatches(fileKey: string): AsyncGenerator<StreamBatch> {
  // ...yields batches
}

// Error: Failed to serialize step return value
```

### Solution

Use serializable batch metadata (`BatchMetadata[]`) with byte offsets, then use Range requests for O(1) seeking. This achieves O(N) total complexity while remaining workflow-compatible.

---

## Performance Comparison

### Before (O(N²))
```
File: 1M records, 20 batches

countLines():     1M reads
Batch 0:          50K reads (skip 0)
Batch 1:          100K reads (skip 50K)
Batch 2:          150K reads (skip 100K)
...
Batch 19:         1M reads (skip 950K)

Total: 1M + 50K(1+2+...+20) = 1M + 50K × 210 = 11.5M reads
```

### After (O(N))
```
File: 1M records, 20 batches

countLines():     1M reads (with byte offset tracking)
Batch 0:          50K reads (Range: bytes=X-Y)
Batch 1:          50K reads (Range: bytes=Y-Z)
...
Batch 19:         50K reads (Range: bytes=...)

Total: 1M + 20 × 50K = 2M reads
```

**Improvement: ~5.75x fewer reads** (and this ratio grows with file size)

---

## Testing

### Verification Commands

```bash
# TypeScript check
pnpm tsc --noEmit

# Build
pnpm build

# Manual test
# 1. Upload a CSV file
# 2. Watch logs for "byte range" mentions
# 3. Verify processing completes faster
```

### Expected Log Output

```
[workflow/create-batches] Counting lines with byte offsets { fileKey: "..." }
[workflow/create-batches] Line count with byte offsets complete {
  totalLines: 100000,
  totalBatches: 20,
  headerByteEnd: 150,
  totalBytes: 15000000
}
[workflow/process-batch] Processing batch {
  batchIndex: 0,
  byteRange: "150-750000",
  expectedLines: 5000
}
[workflow/process-batch] Batch read complete {
  byteRange: "150-750000",
  recordCount: 5000
}
```

---

## Future Optimizations

1. **Parallel countLines()**: Split file into chunks, count in parallel, merge
2. **Streaming inserts**: Start inserting while still parsing
3. **Compression**: Use gzip for R2 storage, decompress on read
4. **Caching**: Cache parsed headers and batch metadata for retries

---

## Related Files

- `src/lib/r2.ts` - R2 client with Range support
- `src/lib/workflow/steps/create-batches.ts` - CSV parsing and batch creation
- `src/lib/workflow/steps/process-batch.ts` - Batch processing and DB inserts
- `src/lib/workflow/process-log-file.ts` - Main workflow orchestrator
- `src/lib/db/schema.ts` - Database schema for log records
