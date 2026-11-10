import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
import { BookingAdminCancel } from "./booking-admin-cancel";

afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset(); });

it("requires explicit confirmation before cancelling and refreshes after success", async () => {
  const fetcher = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ status: "cancelled", id: "booking-1" }) });
  vi.stubGlobal("fetch", fetcher);
  render(<BookingAdminCancel id="booking-1" />);
  await userEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  expect(fetcher).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  expect(fetcher).toHaveBeenCalledWith("/api/admin/bookings/cancel", expect.objectContaining({ body: JSON.stringify({ id: "booking-1" }) }));
  expect(await screen.findByRole("status")).toHaveTextContent("Booking cancelled");
  expect(refresh).toHaveBeenCalledOnce();
});

it("reports pending provider cancellation and unverified errors", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ status: 202, json: async () => ({ status: "pending", id: "booking-1" }) }).mockResolvedValueOnce({ status: 503, json: async () => ({ error: "Try again later." }) });
  vi.stubGlobal("fetch", fetcher);
  render(<BookingAdminCancel id="booking-1" retry />);
  await userEvent.click(screen.getByRole("button", { name: "Retry cancellation" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  expect(await screen.findByRole("status")).toHaveTextContent("still being finalized");
  await userEvent.click(screen.getByRole("button", { name: "Retry cancellation" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Try again later");
});
