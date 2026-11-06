import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingRecovery } from "./booking-recovery";
const id = "123e4567-e89b-42d3-a456-426614174000";
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
it("resumes only a known meeting and prevents duplicate recovery clicks", async () => {
  let resolve!: (value: unknown) => void;
  const fetcher = vi.fn(() => new Promise(done => { resolve = done; })); vi.stubGlobal("fetch", fetcher);
  render(<BookingRecovery id={id} hasMeeting />);
  const button = screen.getByRole("button", { name: "Resume calendar sync" }); await userEvent.click(button); await userEvent.click(button);
  expect(fetcher).toHaveBeenCalledOnce(); expect(JSON.parse(String((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body))).toEqual({ id, action: "resume" });
  resolve({ status: 202, json: async () => ({ status: "pending" }) });
  expect(await screen.findByText(/still pending/)).toBeInTheDocument();
});
it("validates an adopted meeting ID and sends the exact adoption action", async () => {
  const fetcher = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ status: "confirmed" }) }); vi.stubGlobal("fetch", fetcher);
  render(<BookingRecovery id={id} hasMeeting={false} />);
  await userEvent.type(screen.getByLabelText("Existing Zoom meeting ID"), "12345678901");
  await userEvent.click(screen.getByRole("button", { name: "Use existing Zoom meeting" }));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ id, action: "adopt", meetingId: "12345678901" });
  expect(await screen.findByRole("status")).toHaveTextContent("Booking confirmed");
});
it("requires explicit cleanup acknowledgement before release and reports failures as alerts", async () => {
  const fetcher = vi.fn().mockResolvedValue({ status: 409, json: async () => ({ error: "Booking is active." }) }); vi.stubGlobal("fetch", fetcher);
  render(<BookingRecovery id={id} hasMeeting />);
  const release = screen.getByRole("button", { name: "Cancel booking and release time" }); expect(release).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox")); await userEvent.click(release);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ id, action: "release", acknowledged: true });
  expect(await screen.findByRole("alert")).toHaveTextContent("active");
});
