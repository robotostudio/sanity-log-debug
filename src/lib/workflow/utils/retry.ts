import { Logger } from "@/lib/logger";

const logger = new Logger("workflow/utils/retry");

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  options?: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= maxRetries) {
        logger.error(`${context} failed after ${maxRetries + 1} attempts`, {
          error: lastError.message,
        });
        throw lastError;
      }

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      logger.warn(
        `${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`,
        { error: lastError.message },
      );

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error("Unreachable");
}
