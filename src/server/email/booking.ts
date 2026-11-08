import "server-only";
import type { Database } from "@/server/db/connection";
import { emailJob } from "@/server/db/schema";
import type { EmailConfig } from "./config";
import type { EmailPayload } from "./templates";

export type BookingEmailData = {
  id: string;
  email: string;
  start: string;
  end: string;
  timeZone: string;
  joinUrl: string;
  managementUrl: string;
};

export function bookingEmails(data: BookingEmailData, config: EmailConfig) {
  const url = new URL(data.joinUrl);
  // Only participant links are delivered. Host start URLs carry private credentials.
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash ||
      !(url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us")) ||
      !/^\/j\/\d+$/.test(url.pathname) || [...url.searchParams.keys()].some(key => key !== "pwd")) {
    throw new Error("Invalid booking meeting link.");
  }
  const start = new Date(data.start);
  const end = new Date(data.end);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new Error("Invalid booking time.");
  }
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: data.timeZone, dateStyle: "full", timeStyle: "short",
  });
  const details = `When: ${format.format(start)} – ${format.format(end)}\nTime zone: ${data.timeZone}\nJoin Zoom: ${url.href}`;
  // Do not reflect names or notes into the recipient's mailbox: those may contain
  // arbitrary links. Both immutable payloads contain only validated meeting details.
  return [
    {
      id: `booking-owner/${data.id}`, kind: "booking-owner",
      payload: {
        from: config.from, to: [config.owner], reply_to: data.email,
        subject: "New GriffamDev discovery call booked",
        text: `A discovery call is confirmed.\n\n${details}\n\nReview the booking at ${config.origin}/admin/bookings`,
      },
    },
    {
      id: `booking-confirmation/${data.id}`, kind: "booking-confirmation",
      payload: {
        from: config.from, to: [data.email], reply_to: config.owner,
        subject: "Your GriffamDev discovery call is confirmed",
        text: `Your free 30-minute discovery call with Enoch Griffith is confirmed.\n\n${details}\n\nKeep this meeting link private. You can manage or cancel your booking here:\n${data.managementUrl}\n\nWe’ll send you a reminder 24 hours before the call. Cancellation is available until 24 hours before the call.\n\nEnoch Griffith\nFull Stack Software Engineer · GriffamDev`,
      },
    },
  ] satisfies { id: string; kind: string; payload: EmailPayload }[];
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Call inside the transaction that confirms the reservation; delivery happens later.
export async function enqueueBookingEmails(tx: Transaction, data: BookingEmailData, config: EmailConfig) {
  await tx.insert(emailJob).values(bookingEmails(data, config).map(job => ({
    ...job, bookingId: data.id,
  }))).onConflictDoNothing({ target: emailJob.id });
}
