import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingManagement } from "./booking-management";

const booking = { start: "2026-11-10T16:00:00.000Z", end: "2026-11-10T16:30:00.000Z", timeZone: "America/Chicago", status: "confirmed", cancellable: true };

it("loads the booking and submits an explicit cancellation using the private token", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ booking }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "cancelled" }) });
  vi.stubGlobal("fetch", fetcher);
  window.history.replaceState(null, "", `/booking/manage#token=${"A".repeat(43)}`);
  render(<BookingManagement />);
  expect(await screen.findByText("Free 30-minute GriffamDev call · America/Chicago")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Cancel this call" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  expect(await screen.findByRole("status")).toHaveTextContent("has been cancelled");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][0]).toBe("/api/booking/manage");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ token: "A".repeat(43), action: "read" });
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ token: "A".repeat(43), action: "cancel" });
});

it("does not offer cancellation when the cutoff has passed", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ booking: { ...booking, cancellable: false } }) }));
  window.history.replaceState(null, "", `/booking/manage#token=${"B".repeat(43)}`);
  render(<BookingManagement />);
  expect(await screen.findByText(/Online cancellation is available until 24 hours before your call/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel this call" })).not.toBeInTheDocument();
});

it("offers a retry when a provider cancellation is still pending", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ booking: { ...booking, status: "cancellation_pending", cancellable: false } }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "cancelled" }) });
  vi.stubGlobal("fetch", fetcher);
  window.history.replaceState(null, "", `/booking/manage#token=${"C".repeat(43)}`);
  render(<BookingManagement />);
  expect(await screen.findByText("Your cancellation needs another check to finish.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Retry cancellation" }));
  expect(await screen.findByRole("status")).toHaveTextContent("has been cancelled");
});
