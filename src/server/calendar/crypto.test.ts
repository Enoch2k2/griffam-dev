import { expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto";
it("encrypts randomly and rejects tampered data or another key", () => {
  const key = Buffer.alloc(32, 3);
  const value = encrypt("refresh-token", key);
  expect(decrypt(value, key)).toBe("refresh-token");
  expect(value).not.toContain("refresh-token");
  expect(encrypt("refresh-token", key)).not.toBe(value);
  expect(() => decrypt(value, Buffer.alloc(32, 4))).toThrow();
  const parts = value.split("."); parts[2] = Buffer.alloc(16).toString("base64url");
  expect(() => decrypt(parts.join("."), key)).toThrow();
  expect(() => decrypt("bad", key)).toThrow();
});
