import { expect, it } from "vitest";
import { bookingEmails } from "./booking";

const config = { apiKey: "test", from: "hello@example.com", owner: "owner@example.com", origin: "https://example.com" };
const data = {
  id: "booking-id", email: "visitor@example.com", start: "2026-11-09T15:00:00Z", end: "2026-11-09T15:30:00Z",
  timeZone: "America/Chicago", joinUrl: "https://us02web.zoom.us/j/123456789?pwd=participant-passcode",
};

it("creates deterministic recipient and owner confirmations with the requested local time", () => {
  const jobs = bookingEmails(data, config);
  expect(jobs.map(job => job.id)).toEqual(["booking-owner/booking-id", "booking-confirmation/booking-id"]);
  expect(jobs).toEqual(bookingEmails(data, config));
  expect(jobs[0].payload.to).toEqual([config.owner]);
  expect(jobs[1].payload.to).toEqual([data.email]);
  expect(jobs[1].payload.reply_to).toBe(config.owner);
  expect(jobs[1].payload.text).toContain("9:00 AM");
  expect(jobs[1].payload.text).toContain("9:30 AM");
  expect(jobs[1].payload.text).toContain("America/Chicago");
  expect(jobs[1].payload.text).toContain(data.joinUrl);
  expect(jobs[0].payload.text).toContain("https://example.com/admin/bookings");
});

it("does not reflect names, notes, or host credentials into either email", () => {
  const withPrivateFields = { ...data, name: "malicious.example", notes: "private project", startUrl: "host-secret" };
  const rendered = JSON.stringify(bookingEmails(withPrivateFields, config));
  for (const value of [withPrivateFields.name, withPrivateFields.notes, withPrivateFields.startUrl]) expect(rendered).not.toContain(value);
});

it.each([
  "http://zoom.us/j/123", "https://zoom.us.evil.example/j/123", "https://evil.example/j/123",
  "https://user:secret@zoom.us/j/123", "https://zoom.us:8443/j/123", "https://zoom.us/s/123?zak=secret",
  "https://zoom.us/j/123?zak=secret", "https://zoom.us/j/123#secret", "https://zoom.us/j/not-a-meeting",
])("rejects nonparticipant or untrusted meeting URLs: %s", joinUrl => {
  expect(() => bookingEmails({ ...data, joinUrl }, config)).toThrow();
});

it("rejects invalid dates and time zones before queuing emails", () => {
  expect(() => bookingEmails({ ...data, start: "bad date" }, config)).toThrow();
  expect(() => bookingEmails({ ...data, end: data.start }, config)).toThrow();
  expect(() => bookingEmails({ ...data, timeZone: "made/up" }, config)).toThrow();
});
