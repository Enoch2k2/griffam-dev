import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const Bucket = "griffamdev-documents";
const Key = "resume/current.pdf";
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export function resumeConfigured() {
  return process.env.RESUME_ENABLED === "true" && Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}
function client() {
  if (!resumeConfigured()) throw new Error("Resume storage is not configured.");
  return new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3, region: process.env.AWS_REGION,
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
    forcePathStyle: true, maxAttempts: 2 });
}
export async function resumeStatus() {
  if (!resumeConfigured()) return { status: "unconfigured" } as const;
  const s3 = client();
  try {
    const result = await s3.send(new HeadObjectCommand({ Bucket, Key }), { abortSignal: AbortSignal.timeout(15_000) });
    return { status: "available", bytes: result.ContentLength ?? 0, updatedAt: result.LastModified?.toISOString() } as const;
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return { status: "empty" } as const;
    return { status: "unavailable" } as const;
  } finally { s3.destroy(); }
}
export async function putResume(bytes: Uint8Array) {
  const s3 = client();
  try {
    await s3.send(new PutObjectCommand({ Bucket, Key, Body: bytes, ContentType: "application/pdf",
      ContentDisposition: 'attachment; filename="Enoch-Griffith-Resume.pdf"', CacheControl: "no-store" }), { abortSignal: AbortSignal.timeout(30_000) });
  } finally { s3.destroy(); }
}
export async function getResume() {
  const s3 = client();
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket, Key }), { abortSignal: AbortSignal.timeout(15_000) });
    if (!result.Body || !result.ContentLength || result.ContentLength > MAX_RESUME_BYTES) throw new Error("Invalid stored resume.");
    return await result.Body.transformToByteArray();
  } finally { s3.destroy(); }
}
