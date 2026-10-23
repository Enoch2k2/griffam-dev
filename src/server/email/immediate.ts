import "server-only";
import { after } from "next/server";
import { getDatabase } from "@/server/db";
import { readEmailConfig } from "./config";
import { drainEmail } from "./worker";

// This is a latency optimization, not the durable delivery mechanism. The outbox
// and scheduled worker recover if the host stops before this callback completes.
export function scheduleInquiryEmails(inquiryId: string) {
  try {
    after(async () => {
      try {
        const config = readEmailConfig();
        if (config) await drainEmail(getDatabase(), config.apiKey, undefined, inquiryId);
      } catch {
        console.error("Immediate email attempt interrupted; scheduled recovery remains available.");
      }
    });
  } catch {
    // A scheduling failure must never turn a committed inquiry into an HTTP error.
    console.error("Immediate email scheduling unavailable; jobs remain queued.");
  }
}
