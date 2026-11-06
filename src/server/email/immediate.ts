import "server-only";
import { after } from "next/server";
import { getDatabase } from "@/server/db";
import { readEmailConfig } from "./config";
import { drainEmail } from "./worker";

// This is a latency optimization, not the durable delivery mechanism. The outbox
// and scheduled worker recover if the host stops before this callback completes.
function scheduleEmails(inquiryId?: string, bookingId?: string) {
  try {
    after(async () => {
      try {
        const config = readEmailConfig();
        if (config) {
          if (bookingId) await drainEmail(getDatabase(), config.apiKey, undefined, undefined, bookingId);
          else await drainEmail(getDatabase(), config.apiKey, undefined, inquiryId);
        }
      } catch {
        console.error("Immediate email attempt interrupted; scheduled recovery remains available.");
      }
    });
  } catch {
    // A scheduling failure must never turn a committed submission into an HTTP error.
    console.error("Immediate email scheduling unavailable; jobs remain queued.");
  }
}

export function scheduleInquiryEmails(inquiryId: string) { scheduleEmails(inquiryId); }
export function scheduleBookingEmails(bookingId: string) { scheduleEmails(undefined, bookingId); }
