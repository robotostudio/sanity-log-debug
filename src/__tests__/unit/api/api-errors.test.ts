import { describe, it, expect } from "vitest";
import { ApiError, ApiErrorCode, Errors } from "@/lib/api/api-errors";

describe("ApiErrorCode enum", () => {
  it("includes auth-related error codes", () => {
    expect(ApiErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(ApiErrorCode.FORBIDDEN).toBe("FORBIDDEN");
    expect(ApiErrorCode.MAX_SOURCES_REACHED).toBe("MAX_SOURCES_REACHED");
  });
});

describe("Errors factory", () => {
  it("unauthorized() creates 401 error", () => {
    const err = Errors.unauthorized();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ApiErrorCode.UNAUTHORIZED);
  });

  it("forbidden() creates 403 error", () => {
    const err = Errors.forbidden();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ApiErrorCode.FORBIDDEN);
  });

  it("maxSourcesReached() creates 403 with details", () => {
    const err = Errors.maxSourcesReached(3, 5);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ApiErrorCode.MAX_SOURCES_REACHED);
    expect(err.message).toContain("3/5");
    expect(err.details).toEqual({ current: 3, max: 5 });
  });
});
