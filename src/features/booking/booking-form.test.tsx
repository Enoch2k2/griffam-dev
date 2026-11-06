import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingForm } from "./booking-form";
const slot = { start: "2026-11-12T15:00:00Z", end: "2026-11-12T15:30:00Z" };
beforeEach(() => sessionStorage.clear());
async function review() {
  await userEvent.type(screen.getByLabelText("Name"), "Jane Client");
  await userEvent.type(screen.getByLabelText("Email address"), "Jane@example.com");
  await userEvent.type(screen.getByLabelText(/What would/), "A new website");
  await userEvent.click(screen.getByRole("button", { name: "Review booking" }));
}
it("requires review before submitting and displays the returned Zoom confirmation", async () => {
  const fetcher = vi.fn().mockImplementation(async (_url, options) => ({ status: 200, json: async () => ({ status: "confirmed", id: JSON.parse(options.body).id, start: slot.start, end: slot.end, timeZone: "America/Chicago", joinUrl: "https://us02web.zoom.us/j/12345678901?pwd=example", emailQueued: true }) }));
  vi.stubGlobal("fetch", fetcher);
  render(<BookingForm slot={slot} timeZone="America/Chicago" onChangeTime={vi.fn()} />);
  await review(); expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Review your discovery call" })).toBeInTheDocument();
  expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Confirm free call" }));
  expect(screen.getByRole("heading", { name: "Your call is confirmed" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open your Zoom meeting" })).toHaveAttribute("href", "https://us02web.zoom.us/j/12345678901?pwd=example");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ start: slot.start, email: "jane@example.com", timeZone: "America/Chicago", website: "" });
});
it("preserves the exact request after pending and network failures and prevents editing", async () => {
  const fetcher = vi.fn().mockImplementationOnce(async (_url, options) => ({ status: 202, json: async () => ({ status: "pending", id: JSON.parse(options.body).id }) })).mockRejectedValue(new Error("Network"));
  vi.stubGlobal("fetch", fetcher);
  render(<BookingForm slot={slot} timeZone="America/Chicago" onChangeTime={vi.fn()} />);
  await review(); await userEvent.click(screen.getByRole("button", { name: "Confirm free call" }));
  expect(screen.getByRole("alert")).toHaveTextContent("not confirmed yet");
  expect(screen.queryByRole("button", { name: "Edit details" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Retry same booking" }));
  expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body);
  expect(screen.getByRole("alert")).toHaveTextContent("could not verify");
  expect(screen.queryByRole("button", { name: "Choose another time" })).not.toBeInTheDocument();
});
it("allows an explicit new selection after a definite unavailable response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 409, json: async () => ({ error: "That time is no longer available." }) }));
  const change = vi.fn(); render(<BookingForm slot={slot} timeZone="America/Chicago" onChangeTime={change} />);
  await review(); await userEvent.click(screen.getByRole("button", { name: "Confirm free call" }));
  expect(screen.getByRole("alert")).toHaveTextContent("no longer available");
  await userEvent.click(screen.getByRole("button", { name: "Refresh and choose another time" })); expect(change).toHaveBeenCalledOnce();
});
it("rejects a malformed confirmed response without offering an unsafe meeting link", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (_url, options) => ({ status: 200, json: async () => ({ status: "confirmed", id: JSON.parse(options.body).id, joinUrl: "https://evil.example/meeting" }) })));
  render(<BookingForm slot={slot} timeZone="America/Chicago" onChangeTime={vi.fn()} />);
  await review(); await userEvent.click(screen.getByRole("button", { name: "Confirm free call" }));
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("could not confirm");
});
it("disables confirmation while the request is in flight", async () => {
  let resolve!: (value: unknown) => void;
  const fetcher = vi.fn().mockImplementation(() => new Promise(done => { resolve = done; }));
  vi.stubGlobal("fetch", fetcher);
  render(<BookingForm slot={slot} timeZone="America/Chicago" onChangeTime={vi.fn()} />);
  await review(); await userEvent.click(screen.getByRole("button", { name: "Confirm free call" }));
  expect(screen.getByRole("button", { name: "Confirming your call…" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Edit details" })).not.toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledOnce();
  const id = JSON.parse(fetcher.mock.calls[0][1].body).id;
  resolve({ status: 202, json: async () => ({ status: "pending", id }) });
  expect(await screen.findByRole("button", { name: "Retry same booking" })).toBeEnabled();
});
it("recovers the exact uncertain request after a remount", async () => {
  const fetcher = vi.fn().mockImplementation(async (_url, options) => ({ status: 202, json: async () => ({ status: "pending", id: JSON.parse(options.body).id }) }));
  vi.stubGlobal("fetch", fetcher);
  const first = render(<BookingForm slot={slot} timeZone="America/Chicago" onChangeTime={vi.fn()} />);
  await review(); await userEvent.click(screen.getByRole("button", { name: "Confirm free call" }));
  const original = fetcher.mock.calls[0][1].body;
  first.unmount();
  render(<BookingForm slot={slot} timeZone="America/Chicago" onChangeTime={vi.fn()} />);
  expect(await screen.findByRole("button", { name: "Retry same booking" })).toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "Retry same booking" }));
  expect(fetcher.mock.calls[1][1].body).toBe(original);
});
