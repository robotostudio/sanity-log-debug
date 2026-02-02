import type { ApiErrorResponse, ApiSuccessResponse } from "./api";

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Unwrap an API response and return the data or throw an error.
 */
export function unwrapResponse<T>(
  response: ApiSuccessResponse<T> | ApiErrorResponse,
): T {
  if (response.success) {
    return response.data;
  }
  throw new ApiClientError(
    response.error.code,
    response.error.message,
    400,
    response.error.details,
  );
}

/**
 * Fetcher for SWR that handles the new API response format.
 * Throws ApiClientError on API errors.
 */
export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    // Try to parse error response
    try {
      const errorBody = await res.json();
      if (errorBody.success === false && errorBody.error) {
        throw new ApiClientError(
          errorBody.error.code,
          errorBody.error.message,
          res.status,
          errorBody.error.details,
        );
      }
    } catch (e) {
      if (e instanceof ApiClientError) throw e;
    }
    // Fallback for non-JSON responses
    throw new ApiClientError(
      "HTTP_ERROR",
      `Request failed: ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  const body = await res.json();
  return unwrapResponse<T>(body);
}

/**
 * POST/PUT/DELETE request helper that handles the new API response format.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json();

  if (!res.ok || body.success === false) {
    if (body.error) {
      throw new ApiClientError(
        body.error.code,
        body.error.message,
        res.status,
        body.error.details,
      );
    }
    throw new ApiClientError(
      "HTTP_ERROR",
      `Request failed: ${res.status}`,
      res.status,
    );
  }

  return unwrapResponse<T>(body);
}
