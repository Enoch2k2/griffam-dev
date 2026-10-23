import "server-only";
import type { EmailPayload } from "./templates";

export type SendResult =
  | { status: "accepted"; id: string }
  | { status: "retry" | "failed"; error: string };
export async function sendEmail(payload: EmailPayload, key: string, apiKey: string): Promise<SendResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
    });
    if (response.ok) {
      const body = await response.json();
      if (typeof body?.id === "string" && body.id.length > 0) return { status: "accepted", id: body.id };
      return { status: "retry", error: "invalid_provider_response" };
    }
    // Never persist raw provider errors: they can contain recipient data or credentials.
    const retryable = response.status === 429 || response.status === 408 || response.status >= 500;
    return { status: retryable ? "retry" : "failed", error: `provider_http_${response.status}` };
  } catch {
    return { status: "retry", error: "provider_unreachable" };
  }
}
