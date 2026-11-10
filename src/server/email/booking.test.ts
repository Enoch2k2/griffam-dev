import { expect, it } from "vitest";
import { bookingEmails } from "./booking";

const config = { apiKey: "test", from: "hello@example.com", owner: "owner@example.com", origin: "https://example.com" };
const data = {
  id: "booking-id", email: "visitor@example.com", start: "2026-11-09T15:00:00Z", end: "2026-11-09T15:30:00Z",
  timeZone: "America/Chicago", joinUrl: "https://us02web.zoom.us/j/123456789?pwd=participant-passcode",
  managementUrl: "https://example.com/booking/manage?token=example-capability-token",
};

it("creates deterministic confirmations with Central time regardless of the visitor display zone", () => {
  const jobs = bookingEmails({ ...data, timeZone: "America/Los_Angeles" }, config);
  expect(jobs.map(job => job.id)).toEqual(["booking-owner/booking-id", "booking-confirmation/booking-id", "booking-reminder/booking-id"]);
  expect(jobs).toEqual(bookingEmails(data, config));
  expect(jobs[0].payload.to).toEqual([config.owner]);
  expect(jobs[1].payload.to).toEqual([data.email]);
  expect(jobs[1].payload.reply_to).toBe(config.owner);
  expect(jobs[1].payload.text).toContain("9:00 AM CST");
  expect(jobs[1].payload.text).toContain("9:30 AM CST");
  expect(jobs[1].payload.text).toContain("Central Time (America/Chicago)");
  expect(jobs[1].payload.text).toContain(data.joinUrl);
  expect(jobs[1].payload.text).toContain(data.managementUrl);
  expect(jobs[1].payload.text).toContain("reminder 24 hours before");
  expect(jobs[1].payload.text).toContain("until 24 hours before");
  expect(jobs[0].payload.text).toContain("https://example.com/admin/bookings");
  expect(jobs[2].payload.to).toEqual([data.email]);
  expect(jobs[2].payload.text).toContain(data.managementUrl);
  expect(jobs[2].payload.subject).toContain("tomorrow");
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
