import { expect, it } from "vitest";
import { createBookingManagementToken, hashBookingManagementToken, isValidBookingManagementToken, matchesBookingManagementToken } from "./management-token";

it("creates a high-entropy URL-safe capability and stores only its stable digest", () => {
  const first = createBookingManagementToken();
  const second = createBookingManagementToken();
  expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(first.token).not.toBe(second.token);
  expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(hashBookingManagementToken(first.token)).toBe(first.hash);
  expect(first.hash).not.toContain(first.token);
});

it.each([undefined, null, "", "bad", "x".repeat(42), "x".repeat(44)])("rejects malformed management token: %s", token => {
  expect(isValidBookingManagementToken(token)).toBe(false);
});

it("compares only valid token digests safely", () => {
  const { token, hash } = createBookingManagementToken();
  expect(matchesBookingManagementToken(token, hash)).toBe(true);
  expect(matchesBookingManagementToken(`${token.slice(0, -1)}x`, hash)).toBe(false);
  expect(matchesBookingManagementToken(token, "bad-hash")).toBe(false);
});
