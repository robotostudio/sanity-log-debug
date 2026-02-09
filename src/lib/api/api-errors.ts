export enum ApiErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  FILE_PROCESSING = "FILE_PROCESSING",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  WORKFLOW_ERROR = "WORKFLOW_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  MAX_SOURCES_REACHED = "MAX_SOURCES_REACHED",
}

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const Errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new ApiError(ApiErrorCode.VALIDATION_ERROR, message, 400, details),

  notFound: (resource: string) =>
    new ApiError(ApiErrorCode.FILE_NOT_FOUND, `${resource} not found`, 404),

  fileNotFound: (fileKey?: string) =>
    new ApiError(
      ApiErrorCode.FILE_NOT_FOUND,
      fileKey ? `File '${fileKey}' not found` : "File not found",
      404,
    ),

  fileProcessing: (status: string) =>
    new ApiError(
      ApiErrorCode.FILE_PROCESSING,
      "File is still processing",
      202,
      { status },
    ),

  internal: (message = "Internal server error") =>
    new ApiError(ApiErrorCode.INTERNAL_ERROR, message, 500),

  workflow: (message: string, details?: Record<string, unknown>) =>
    new ApiError(ApiErrorCode.WORKFLOW_ERROR, message, 500, details),

  unauthorized: (message = "Authentication required") =>
    new ApiError(ApiErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message = "Access denied") =>
    new ApiError(ApiErrorCode.FORBIDDEN, message, 403),

  maxSourcesReached: (current: number, max: number) =>
    new ApiError(
      ApiErrorCode.MAX_SOURCES_REACHED,
      `Source limit reached (${current}/${max})`,
      403,
      { current, max },
    ),
};
