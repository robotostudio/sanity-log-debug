import { http, HttpResponse } from "msw";

// Base URL for R2 mock
const R2_BASE_URL = "https://test-account-id.r2.cloudflarestorage.com";

export const handlers = [
  // Mock R2 presigned URL upload
  http.put(`${R2_BASE_URL}/*`, async ({ request }) => {
    // Simulate successful chunk upload
    return new HttpResponse(null, {
      status: 200,
      headers: {
        ETag: `"${crypto.randomUUID()}"`,
      },
    });
  }),

  // Mock R2 GET for file streaming
  http.get(`${R2_BASE_URL}/*`, async ({ request }) => {
    // Return mock CSV data for testing
    const mockData = `"timestamp","traceId","spanId","severityText","severityNumber","body","attributes","resource"
"2026-01-28T00:01:57.947Z","trace-001","span-001","INFO",9,"{\\"duration\\":32.088}","{\\"sanity\\":{\\"projectId\\":\\"test\\"}}","{}"`;
    return new HttpResponse(mockData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Length": String(mockData.length),
      },
    });
  }),

  // Mock multipart upload initiation
  http.post(`${R2_BASE_URL}/*`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.has("uploads")) {
      // CreateMultipartUpload
      return HttpResponse.xml(`
        <?xml version="1.0" encoding="UTF-8"?>
        <InitiateMultipartUploadResult>
          <Bucket>test-bucket</Bucket>
          <Key>logs/test-file.csv</Key>
          <UploadId>test-upload-id-${Date.now()}</UploadId>
        </InitiateMultipartUploadResult>
      `);
    }
    if (url.searchParams.has("uploadId")) {
      // CompleteMultipartUpload
      return HttpResponse.xml(`
        <?xml version="1.0" encoding="UTF-8"?>
        <CompleteMultipartUploadResult>
          <Location>${R2_BASE_URL}/test-bucket/logs/test-file.csv</Location>
          <Bucket>test-bucket</Bucket>
          <Key>logs/test-file.csv</Key>
          <ETag>"mock-etag-complete"</ETag>
        </CompleteMultipartUploadResult>
      `);
    }
    return new HttpResponse(null, { status: 400 });
  }),

  // Mock abort multipart upload
  http.delete(`${R2_BASE_URL}/*`, async ({ request }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];

// Additional handlers for specific test scenarios
export const errorHandlers = {
  // Simulate chunk upload failure
  chunkUploadFailure: http.put(`${R2_BASE_URL}/*`, () => {
    return new HttpResponse(null, { status: 500 });
  }),

  // Simulate network timeout
  networkTimeout: http.put(`${R2_BASE_URL}/*`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 60000));
    return new HttpResponse(null, { status: 200 });
  }),

  // Simulate partial upload (chunk 3 fails)
  partialFailure: (failOnChunk: number) =>
    http.put(`${R2_BASE_URL}/*`, async ({ request }) => {
      const url = new URL(request.url);
      const partNumber = url.searchParams.get("partNumber");
      if (partNumber === String(failOnChunk)) {
        return new HttpResponse(null, { status: 500 });
      }
      return new HttpResponse(null, {
        status: 200,
        headers: { ETag: `"etag-${partNumber}"` },
      });
    }),
};
