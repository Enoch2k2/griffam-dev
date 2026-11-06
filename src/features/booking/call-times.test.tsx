import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CallTimes } from "./call-times";
beforeEach(() => sessionStorage.clear());
it("loads on request and converts dates and times when the visitor changes time zone", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ days: 30, slots: [{ start: "2026-11-05T01:00:00Z", end: "2026-11-05T01:30:00Z" }] }) });
  vi.stubGlobal("fetch", fetcher); render(<CallTimes timeZones={["America/Chicago", "Asia/Tokyo"]} />);
  expect(fetcher).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "View available times" }));
  expect(screen.getByRole("heading", { name: "Wednesday, November 4, 2026" })).toBeInTheDocument();
  expect(screen.getByText("7:00 PM CST")).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Display time zone"), "Asia/Tokyo");
  expect(screen.getByRole("heading", { name: "Thursday, November 5, 2026" })).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("clears previously displayed times when refresh fails and permits retry", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ days: 30, slots: [{ start: "2026-11-05T15:00:00Z", end: "2026-11-05T15:30:00Z" }] }) }).mockResolvedValue({ ok: false });
  vi.stubGlobal("fetch", fetcher); render(<CallTimes timeZones={["America/Chicago", "Asia/Tokyo"]} />);
  await userEvent.click(screen.getByRole("button", { name: "View available times" }));
  await userEvent.click(screen.getByRole("button", { name: "Refresh times" }));
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("temporarily unavailable");
  expect(screen.getByRole("button", { name: "View available times" })).toBeEnabled();
});
it("explains when the window has no available calls", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ days: 30, slots: [] }) }));
  render(<CallTimes timeZones={["America/Chicago", "Asia/Tokyo"]} />); await userEvent.click(screen.getByRole("button", { name: "View available times" }));
  expect(screen.getByRole("status")).toHaveTextContent("No call times are available");
});
it("offers selectable slots only when booking is explicitly enabled", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bookingEnabled: true, days: 30, slots: [{ start: "2026-11-05T15:00:00Z", end: "2026-11-05T15:30:00Z" }] }) }));
  render(<CallTimes timeZones={["America/Chicago"]} />);
  await userEvent.click(screen.getByRole("button", { name: "View available times" }));
  await userEvent.click(screen.getByRole("button", { name: /Book Thursday/ }));
  expect(screen.getByRole("heading", { name: "Your details" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Display time zone")).not.toBeInTheDocument();
});
it("shows times for only the selected day without fetching again", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bookingEnabled: true, days: 30, slots: [
    { start: "2026-11-05T15:00:00Z", end: "2026-11-05T15:30:00Z" },
    { start: "2026-11-06T16:00:00Z", end: "2026-11-06T16:30:00Z" },
  ] }) });
  vi.stubGlobal("fetch", fetcher); render(<CallTimes timeZones={["America/Chicago"]} />);
  await userEvent.click(screen.getByRole("button", { name: "View available times" }));
  expect(screen.getByRole("button", { name: /Book Thursday, November 5.*9:00 AM CST/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Book Friday/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Friday, November 6, 2026, 1 available time" }));
  expect(screen.getByRole("button", { name: /Book Friday, November 6.*10:00 AM CST/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Book Thursday/ })).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledOnce();
});
it("refreshes after choosing another time and preserves the selected day", async () => {
  const response = { ok: true, json: async () => ({ bookingEnabled: true, days: 30, slots: [{ start: "2026-11-05T15:00:00Z", end: "2026-11-05T15:30:00Z" }] }) };
  const fetcher = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetcher); render(<CallTimes timeZones={["America/Chicago"]} />);
  await userEvent.click(screen.getByRole("button", { name: "View available times" }));
  await userEvent.click(screen.getByRole("button", { name: /Book Thursday/ }));
  await userEvent.click(screen.getByRole("button", { name: "Choose another time" }));
  expect(await screen.findByRole("button", { name: /Book Thursday/ })).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("fails closed on malformed availability instead of rendering unsafe slots", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bookingEnabled: true, days: 30, slots: [{ start: "bad", end: "also-bad" }] }) }));
  render(<CallTimes timeZones={["America/Chicago"]} />);
  await userEvent.click(screen.getByRole("button", { name: "View available times" }));
  expect(screen.getByRole("status")).toHaveTextContent("temporarily unavailable");
  expect(screen.queryByRole("button", { name: /Book/ })).not.toBeInTheDocument();
});
