/**
 * ai-retry.ts
 *
 * Shared retry / error-classification utilities for Vertex AI / Gemini calls.
 * Import these in image-generator.ts, story-generator.ts, and any future
 * generator that calls Vertex AI.
 */

// ─── Error Classification ─────────────────────────────────────────────────────

export type AiErrorKind =
  | "QUOTA_EXHAUSTED" // gRPC 8 / HTTP 429 — retryable with backoff
  | "UNAVAILABLE" // gRPC 14 / HTTP 503 — retryable
  | "CONTENT_POLICY" // blocked by safety filters — NOT retryable
  | "INVALID_REQUEST" // bad prompt / argument — NOT retryable
  | "PERMISSION_DENIED" // auth / IAM issue — NOT retryable
  | "TRANSIENT" // unknown / network — retryable
  | "UNKNOWN"; // catch-all — NOT retryable

/**
 * Classify a thrown error from a Vertex AI / @ai-sdk call.
 * The AI SDK wraps gRPC status in the error message/cause chain; we inspect
 * both the message string and any numeric `status` or `code` properties.
 */
export function classifyAiError(error: unknown): AiErrorKind {
  const msg =
    error instanceof Error
      ? `${error.message} ${(error as any).cause ?? ""}`.toLowerCase()
      : String(error).toLowerCase();

  // gRPC code 8 / HTTP 429
  if (
    msg.includes("resource_exhausted") ||
    msg.includes("resource has been exhausted") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    (error instanceof Error && (error as any).status === 429) ||
    (error instanceof Error && (error as any).code === 8)
  ) {
    return "QUOTA_EXHAUSTED";
  }

  // gRPC code 14 / HTTP 503
  if (
    msg.includes("unavailable") ||
    msg.includes("503") ||
    (error instanceof Error && (error as any).status === 503) ||
    (error instanceof Error && (error as any).code === 14)
  ) {
    return "UNAVAILABLE";
  }

  // Safety / content-policy blocks
  if (
    msg.includes("safety") ||
    msg.includes("content_filter") ||
    msg.includes("blocked") ||
    msg.includes("finish_reason: safety") ||
    msg.includes("finish_reason:safety")
  ) {
    return "CONTENT_POLICY";
  }

  // Auth / IAM
  if (
    msg.includes("permission_denied") ||
    msg.includes("403") ||
    (error instanceof Error && (error as any).status === 403) ||
    (error instanceof Error && (error as any).code === 7)
  ) {
    return "PERMISSION_DENIED";
  }

  // Bad input
  if (
    msg.includes("invalid_argument") ||
    msg.includes("400") ||
    (error instanceof Error && (error as any).status === 400) ||
    (error instanceof Error && (error as any).code === 3)
  ) {
    return "INVALID_REQUEST";
  }

  // Generic network / timeout
  if (
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout")
  ) {
    return "TRANSIENT";
  }

  return "UNKNOWN";
}

export function isRetryable(kind: AiErrorKind): boolean {
  return (
    kind === "QUOTA_EXHAUSTED" || kind === "UNAVAILABLE" || kind === "TRANSIENT"
  );
}

// ─── Retry with Exponential Backoff + Jitter ──────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number; // default 5
  baseDelayMs?: number; // default 1000
  maxDelayMs?: number; // default 30_000
  /** Called on each retryable failure before sleeping */
  onRetry?: (opts: {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
    errorKind: AiErrorKind;
    error: unknown;
    context?: string;
  }) => void;
}

/**
 * Run `fn` with retry on transient / quota errors.
 * Throws immediately on non-retryable errors (content policy, bad args, auth).
 * Throws the last error after exhausting attempts.
 */
export async function withAiRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: string,
): Promise<T> {
  const {
    maxAttempts = 5,
    baseDelayMs = 1_000,
    maxDelayMs = 30_000,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const kind = classifyAiError(error);

      if (!isRetryable(kind)) {
        // Non-retryable: surface immediately with classification
        const classified = new Error(
          `[${kind}] ${error instanceof Error ? error.message : String(error)}`,
        );
        (classified as any).errorKind = kind;
        (classified as any).cause = error;
        throw classified;
      }

      if (attempt >= maxAttempts) break;

      // Exponential backoff with full jitter: delay = rand(0, min(cap, base * 2^attempt))
      const cap = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const delayMs = Math.floor(Math.random() * cap) + baseDelayMs;

      onRetry?.({
        attempt,
        maxAttempts,
        delayMs,
        errorKind: kind,
        error,
        context,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Exhausted all attempts
  const exhausted = new Error(
    `[QUOTA_EXHAUSTED after ${maxAttempts} attempts] ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
  (exhausted as any).errorKind = "QUOTA_EXHAUSTED";
  (exhausted as any).cause = lastError;
  throw exhausted;
}

// ─── Inline Semaphore (no new deps) ──────────────────────────────────────────

/**
 * Lightweight semaphore for bounding concurrent async operations.
 * Usage:
 *   const sem = createSemaphore(3);
 *   await sem.run(() => expensiveCall());
 */
export function createSemaphore(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (queue.length > 0 && active < limit) {
      active++;
      const resolve = queue.shift()!;
      resolve();
    }
  }

  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await new Promise<void>((resolve) => {
        if (active < limit) {
          active++;
          resolve();
        } else {
          queue.push(resolve);
        }
      });
      try {
        return await fn();
      } finally {
        active--;
        next();
      }
    },
  };
}
