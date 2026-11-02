import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function encrypt(value: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("griffamdev-calendar-v1"));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}
export function decrypt(value: string, key: Buffer) {
  const [version, iv, tag, data, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data || extra) throw new Error("Invalid calendar credential");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from("griffamdev-calendar-v1"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
