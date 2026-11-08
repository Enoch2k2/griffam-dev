import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createBookingManagementToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashBookingManagementToken(token) };
}

export function hashBookingManagementToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidBookingManagementToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function matchesBookingManagementToken(token: unknown, expectedHash: unknown) {
  if (!isValidBookingManagementToken(token) || typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  return timingSafeEqual(Buffer.from(hashBookingManagementToken(token), "hex"), Buffer.from(expectedHash, "hex"));
}
