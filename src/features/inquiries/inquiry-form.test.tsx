import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InquiryForm } from "./inquiry-form";
afterEach(() => vi.unstubAllGlobals());
function fill() {
  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Test Person" } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText(/^What would/), { target: { value: "I would like a useful web application." } });
}
describe("inquiry form", () => {
  it("announces validation errors without making a request", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<InquiryForm />);
    await userEvent.click(screen.getByRole("button", { name: "Send project inquiry" }));
    expect(screen.getByRole("alert")).toHaveTextContent("highlighted fields");
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps the message and idempotency key when retrying an uncertain response", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "saved" }) });
    vi.stubGlobal("fetch", fetch);
    render(<InquiryForm />); fill();
    await userEvent.click(screen.getByRole("button", { name: "Send project inquiry" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText(/^What would/)).toHaveValue("I would like a useful web application.");
    await userEvent.click(screen.getByRole("button", { name: "Send project inquiry" }));
    await screen.findByRole("status");
    const first = JSON.parse(fetch.mock.calls[0][1].body);
    const second = JSON.parse(fetch.mock.calls[1][1].body);
    expect(first.id).toBe(second.id);
    expect(screen.getByRole("status")).toHaveTextContent("No appointment has been booked");
  });
  it("disables submission while saving and displays server errors", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(r => { resolve = r; })));
    render(<InquiryForm />); fill();
    await userEvent.click(screen.getByRole("button", { name: "Send project inquiry" }));
    expect(screen.getByRole("button", { name: "Saving inquiry…" })).toBeDisabled();
    resolve({ ok: false, json: async () => ({ error: "Please try again later." }) });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Please try again later."));
    expect(screen.getByRole("button", { name: "Send project inquiry" })).toBeEnabled();
  });
});
