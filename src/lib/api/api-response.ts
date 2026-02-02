import { NextResponse } from "next/server";
import { ApiError, type ApiErrorCode, Errors } from "./api-errors";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function success<T>(
  data: T,
  status = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data } as ApiSuccessResponse<T>, {
    status,
  });
}

export function error(apiError: ApiError): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: apiError.code,
        message: apiError.message,
        ...(apiError.details && { details: apiError.details }),
      },
    } as ApiErrorResponse,
    { status: apiError.statusCode },
  );
}

export function handleError(
  err: unknown,
  fallbackMessage = "An unexpected error occurred",
): NextResponse<ApiErrorResponse> {
  if (err instanceof ApiError) {
    return error(err);
  }

  const message = err instanceof Error ? err.message : fallbackMessage;
  return error(Errors.internal(message));
}
