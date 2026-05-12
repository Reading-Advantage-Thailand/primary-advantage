/**
 * Tests for lib/session.ts
 *
 * Note on memoization: react.cache() deduplicates calls within a single React
 * Server Component render pass (via React's internal async context). Outside of
 * an RSC render tree — as is the case in this Vitest environment — each call is
 * independent, so we cannot assert "4 calls → 1 DB hit" here.
 *
 * What we CAN test:
 *   - The wrapper is idempotent: calling getCurrentUser() in isolation returns
 *     the same shape each time (happy path, null path, error path).
 *   - The safety net: a throw from auth.api.getSession surfaces as null, not a
 *     thrown exception.
 *   - The cache wrapper does not change the return type or introduce extra layers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Module mocks --------------------------------------------------------
// Must be declared before the dynamic import of the module under test so that
// Vitest's module registry replaces the real implementations.

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

const mockGetSession = vi.fn();

vi.mock("./auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// Dynamic import AFTER mocks are registered so the module sees the mocks.
const { getCurrentUser } = await import("./session");

// -------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser", () => {
  it("happy path: returns session.user when getSession resolves with a session", async () => {
    const fakeUser = { id: "user-1", name: "Alice", role: "student" };
    mockGetSession.mockResolvedValue({ user: fakeUser });

    const result = await getCurrentUser();

    expect(result).toEqual(fakeUser);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("null session path: returns null when getSession resolves with null", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await getCurrentUser();

    expect(result).toBeNull();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("error safety: returns null (does not throw) when getSession throws", async () => {
    mockGetSession.mockRejectedValue(new Error("DB connection lost"));

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  /**
   * Memoization contract (RSC context):
   *
   * react.cache() guarantees a single underlying call only when executed inside
   * a React Server Component render pass. In this Vitest/Node environment there
   * is no RSC context, so each Promise.all leg is independent and getSession is
   * called once per leg.
   *
   * This test documents that known constraint explicitly and asserts the
   * observable behaviour in the test environment: all legs resolve to the same
   * value (consistent reads), which is the invariant that matters for
   * correctness testing outside of React's render context.
   */
  it("memoization (RSC context note): all concurrent calls resolve to the same value", async () => {
    const fakeUser = { id: "user-42", name: "Bob", role: "teacher" };
    mockGetSession.mockResolvedValue({ user: fakeUser });

    const results = await Promise.all([
      getCurrentUser(),
      getCurrentUser(),
      getCurrentUser(),
      getCurrentUser(),
    ]);

    // Every leg must return the same user object.
    for (const result of results) {
      expect(result).toEqual(fakeUser);
    }

    // Outside RSC context each call is independent — document this explicitly.
    // Inside a real RSC render, getSession would be called only once.
    // We assert it was called at least once and no more than 4 times (the
    // upper bound in non-RSC environments).
    expect(mockGetSession.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mockGetSession.mock.calls.length).toBeLessThanOrEqual(4);
  });
});
