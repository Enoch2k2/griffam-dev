import "server-only";
import type { Database } from "@/server/db/connection";
import { emailJob } from "@/server/db/schema";
import type { EmailConfig } from "./config";
import type { EmailPayload } from "./templates";
import { BOOKING_TIME_ZONE, formatBookingDateTime, formatBookingRange } from "@/features/booking/time-zone";

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
  try { new Intl.DateTimeFormat("en-US", { timeZone: data.timeZone }); }
  catch { throw new Error("Invalid booking time zone."); }
  const details = `When: ${formatBookingRange(start, end)}\nTime zone: Central Time (${BOOKING_TIME_ZONE})\nJoin Zoom: ${url.href}`;
  // Do not reflect names or notes into the recipient's mailbox: those may contain
  // arbitrary links. Both immutable payloads contain only validated meeting details.
  const jobs = [
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
    {
      id: `booking-reminder/${data.id}`, kind: "booking-reminder",
      payload: {
        from: config.from, to: [data.email], reply_to: config.owner,
        subject: "Reminder: your GriffamDev discovery call is tomorrow",
        text: `This is a reminder that your free 30-minute discovery call with Enoch Griffith is tomorrow.\n\n${details}\n\nNeed to cancel? Use your secure booking link before the 24-hour cutoff:\n${data.managementUrl}\n\nEnoch Griffith\nFull Stack Software Engineer · GriffamDev`,
      },
    },
  ] satisfies { id: string; kind: string; payload: EmailPayload }[];
  return jobs;
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Call inside the transaction that confirms the reservation; delivery happens later.
export async function enqueueBookingEmails(tx: Transaction, data: BookingEmailData, config: EmailConfig) {
  const scheduledReminderAt = Date.parse(data.start) - 24 * 60 * 60_000;
  // The site requires 24 hours' notice. A visitor booking exactly at that
  // boundary should receive the reminder on the next worker sweep, never inline
  // with the confirmation.
  const reminderAt = new Date(Math.max(scheduledReminderAt, Date.now() + 60_000));
  await tx.insert(emailJob).values(bookingEmails(data, config).map(job => ({
    ...job, bookingId: data.id,
    ...(job.kind === "booking-reminder" ? { availableAt: reminderAt } : {}),
  }))).onConflictDoNothing({ target: emailJob.id });
}

export async function enqueueBookingCancellation(tx: Transaction, data: { id: string; email: string; start: string; timeZone: string }, config: EmailConfig) {
  const when = formatBookingDateTime(data.start);
  await tx.insert(emailJob).values({
    id: `booking-cancellation/${data.id}`, bookingId: data.id, kind: "booking-cancellation",
    payload: {
      from: config.from, to: [data.email], reply_to: config.owner,
      subject: "Your GriffamDev discovery call was cancelled",
      text: `Your discovery call scheduled for ${when} Central Time (${BOOKING_TIME_ZONE}) has been cancelled. The Zoom meeting and calendar invitation have also been cancelled.\n\nEnoch Griffith\nFull Stack Software Engineer · GriffamDev`,
    },
  }).onConflictDoNothing({ target: emailJob.id });
}
