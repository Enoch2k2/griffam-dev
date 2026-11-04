import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CallTimes } from "./call-times";
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
